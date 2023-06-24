class App {
  constructor() {
    // Confirm whether app.js is connected
    document.addEventListener("DOMContentLoaded", () => {console.log("app.js connected")});
    this.initializeSettings();
    this.initializeData();
    this.initializeUI();
  }

  initializeSettings() {
    this.settings = {
      separator: "\r\n==========\r\n",
      duplicateSubstringLength: 40
    };
  }

  initializeData() {
    this.sources = [] // Contains objects representing raw source strings from 'my clippings.txt' files
    this.highlights = [] // Contains objects representing individual highlights
    this.books = [] // Contains objects representing distinct books
    this.sourceId = 0;
    this.highlightId = 0;
    this.bookId = 0;
    this.clearMenu();
    this.clearView();
    this.state();
  }

  initializeUI() {
    // Initialize main actions
    document.querySelector("#reset").addEventListener("click", () => this.initializeData());

    // Initialize drag-and-drop area
    const dropArea = document.querySelector("#menu")
    dropArea.addEventListener("dragenter", (event) => {
      dropArea.style.backgroundColor = "#F8D6A0";
    });

    dropArea.addEventListener("dragleave", (event) => {
      dropArea.style.backgroundColor = null;
    });

    dropArea.addEventListener('dragover', (event) => {
      event.stopPropagation();
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      dropArea.style.backgroundColor = "#F8D6A0";
    });

    dropArea.addEventListener("drop", (event) => {
      event.stopPropagation();
      event.preventDefault();
      dropArea.style.backgroundColor = null;

      // Read each dropped file upon drop
      const files = event.dataTransfer.files;
      for (let i = 0; i < files.length; i++) {
        this.readFile(files.item(i));
      }
    });
  }

  readFile(file) {
    const reader = new FileReader();

    // Add a listener for the file load
    reader.addEventListener("load", (event) => {
      const source = {
        id: this.assignSourceId(),
        filename: file.name,
        text: event.target.result
      };

      // Add raw text to sources upon load
      this.sources.push(source)
      console.log(`File '${source.filename}' imported`);
      this.extractData(source);
    });
    reader.readAsText(file);
  }

  extractData(source) {
    // Analyse sources to populate highlights and books, update view
    this.extractHighlightsFromSource(source);
    this.hideDropInstructions()
    this.displayBookList();
    this.displaySourceList();
    this.displaySmartLists();
    this.clearView();
    this.state();
  }

  extractHighlightsFromSource(source) {
    const clippings = source.text.split(/\s*==========\s*/);
    clippings.forEach((clipping) => {
      if (!clipping) return null

      // Parse clipping and create highlight object
      const regex = /(?<title>[\S ]+) (?:- (?<authorAlt>[\w ]+)|\((?<author>[^(]+)\))\s*- Your (?<type>\w+) on page (?<pageStart>\d*)-?(?<pageEnd>\d*)(?: \| location (?<locationStart>\d+)-?(?<locationEnd>\d*))? \| Added on (?<date>[\S ]*)\s*(?<text>.*)\s*/
      const highlight = clipping.match(regex).groups
      highlight.original = clipping;
      highlight.metadata = clipping.split(/(\r?\n)/).slice(0,3).join('');

      // Assign unique id
      highlight.id = this.assignHighlightId();

      // Initialise duplicates array
      highlight.duplicates = [];

      // Find existing book or create new book
      const book = this.findBookbyTitle(highlight.title) || this.createBook(highlight.title);

      // Link highlight and book both ways
      highlight.book = book;

      // Push highlight into highlights and book highlights
      this.highlights.push(highlight);
      book.highlights.push(highlight);
    });
  }

  createBook(title) {
    const book = {
      id: this.assignBookId(),
      title: title,
      highlights: []
    }
    this.books.push(book);
    return book;
  }

  findBookbyTitle(title) {
    return this.books.find(book => book.title === title);
  }

  downloadFile(filename, text) {
    // Generate download url for data
    const data = new Blob([text], {type: "text/plain"}); // Encoding can be specified here: "text/plain;charset=utf-8"
    const url = window.URL.createObjectURL(data);

    // Generating download link and activate download
    const link = document.createElement("a");
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.click()

    URL.revokeObjectURL(url)
  }

  generateOutput(book) {
    const highlights = this.findHighlightsFromBook(book);
    const clippings = highlights.map(highlight => {
      const text = highlight.textEdited || highlight.text;
      return `${highlight.metadata}\r\n\r\n${text}`;
    });
    const output = clippings.join(this.settings.separator) + this.settings.separator;
    console.log(output);
    return output
  }

  assignHighlightId() {return this.highlightId += 1}
  assignSourceId() {return this.sourceId += 1}
  assignBookId() {return this.bookId += 1}


  findHighlightsFromBook(book) {
    return this.highlights.filter(highlight => ((highlight.title === book.title) && !highlight.deleted));
  }

  findEditedHighlights() {
    return this.highlights.filter(highlight => (highlight.textEdited));

  }
  findDeletedHighlights() {
    return this.highlights.filter(highlight => (highlight.deleted));
  }

  deleteHighlight(highlight) {
    highlight.deleted = true;
    return highlight;
  }

  undoDeleteHighlight(highlight) {
    highlight.deleted = false;
    return highlight;
  }

  duplicateCompare(highlight1, highlight2) {
    const check = this.checkForCommonSubstring(highlight1.text, highlight2.text, this.settings.duplicateSubstringLength);
    if (check.found) {
      // Link duplicate highlights
      highlight1.duplicates.push(highlight2);
      highlight2.duplicates.push(highlight1);
    }
    return check
  }

  scanForDuplicates(highlights) {
    const n = highlights.length;

    // Compare each highlight with all the others once
    for (let i = 0; i <= n - 1; i++) {
      for (let j = i + 1; j <= n - 1; j++) {
        this.duplicateCompare(highlights[i], highlights[j])

        // [TESTING]
        // Count number of times a highlight has been tested (should equal n - 1)
        highlights[i].tested = highlights[i].tested + 1 || 1;
        highlights[j].tested = highlights[j].tested + 1 || 1;
      }
    }
  }

  // # COMPONENTS

  // ## MENU

  clearMenu() {
    this.showDropInstructions();
    document.querySelector("#booklist").innerHTML = "";
    document.querySelector("#smartlists").innerHTML = "";
    document.querySelector("#sourcelist").innerHTML = "";
  }

  showDropInstructions() {
    document.querySelector("#drop-instructions").style.display = "flex";
  }

  hideDropInstructions() {
    document.querySelector("#drop-instructions").style.display = "none";
  }

  removeActiveMenu() {
    document.querySelectorAll("#menu .active").forEach(element => {element.classList.remove("active")});
  }

  // ### BOOKLIST

  generateBookList() {
    // Clone template
    const template = document.querySelector("#booklist-template");
    const clone = template.content.cloneNode(true);

    // Update header with total number of books
    clone.querySelector("#booklist-header").innerText = `all books (${this.books.length})`;

    // Sort books alphabetically
    this.books.sort((a, b) => {return a.title.localeCompare(b.title)});

    // Add books as list items
    this.books.forEach(book => {
      const bookItem = document.createElement("li");
      bookItem.setAttribute("data-id", book.id);
      bookItem.textContent = book.title + ` (${book.highlights.length})`;

      // Add event listener to display books and toggle active
      bookItem.addEventListener("click", (event) => {
        this.viewHighlightsOfBook(book);
        this.removeActiveMenu();
        event.currentTarget.classList.add("active");
      });

      clone.querySelector("ul").appendChild(bookItem);
    });

    return clone
  }

  displayBookList() {
    const bookList = document.querySelector("#booklist");
    bookList.innerHTML = "";
    bookList.appendChild(this.generateBookList());
  }

  // ### SOURCE LIST

  generateSourceList() {
    // Clone template
    const template = document.querySelector("#sourcelist-template");
    const clone = template.content.cloneNode(true);

    // Update header with total number of sources
    clone.querySelector("#sourcelist-header").innerText = `all sources (${this.sources.length})`

    // Add sources as list items
    this.sources.forEach(source => {
      const sourceItem = document.createElement("li");
      sourceItem.setAttribute("data-id", source.id);
      sourceItem.textContent = source.filename + ` (#${source.id})`;

      // Add event listener to display source and toggle active
      sourceItem.addEventListener("click", (event) => {
        this.viewSource(source);
        this.removeActiveMenu();
        event.currentTarget.classList.add("active");
      });

      clone.querySelector("ul").appendChild(sourceItem);
    });

    return clone
  }

  displaySourceList() {
    const sourceList = document.querySelector("#sourcelist");
    sourceList.innerHTML = "";
    sourceList.appendChild(this.generateSourceList());
  }

  // ## SMART LISTS

  generateSmartLists() {
    // Clone template
    const template = document.querySelector("#smartlists-template");
    const clone = template.content.cloneNode(true);

    // Update header
    clone.querySelector("#smartlists-header").innerText = `all lists`

    const lists = [
      {
        id: "markedlist",
        header: `all marked (${0})`,
        action: () => {console.log("TEST MARKED!")}
      },
      {
        id: "editedlist",
        header: `all edited (${0})`,
        action: () => {console.log("TEST EDITED!")}
      },
      {
        id: "duplicatelist",
        header: `all duplicates (${0})`,
        action: () => {console.log("TEST DUPLICATES!")}
      },
      {
        id: "deletedlist",
        header: `all deleted (${0})`,
        action: () => {console.log("TEST DELETED!")}
      },
      {
        id: "bookmarklist",
        header: `all bookmarks (${0})`,
        action: () => {console.log("TEST BOOKMARKS!")}
      },
      {
        id: "notelist",
        header: `all notes (${0})`,
        action: () => {console.log("TEST NOTES!")}
      },
    ];

    // Add lists as list items
    lists.forEach(list => {
      const item = document.createElement("li");
      item.id = list.id;
      item.textContent = list.header;
      item.addEventListener("click", (event) => {
        list.action();
        this.removeActiveMenu();
        event.currentTarget.classList.add("active");
      });
      clone.querySelector("ul").appendChild(item);
    });

    return clone
  }

  displaySmartLists() {
    const smartLists = document.querySelector("#smartlists");
    smartLists.innerHTML = "";
    smartLists.appendChild(this.generateSmartLists());
  }

  // ## VIEW

  clearView() {
    const view = document.querySelector("#view");
    view.innerHTML = "";

    const template = document.querySelector("#view-template");
    const clone = template.content.cloneNode(true);
    view.appendChild(clone);
  }

  // ### VIEW HEADER

  displayViewHeader(text) {
    document.querySelector("#view-header").innerText = text;
  }

  // ## VIEW ACTIONS
  // TODO

  // ## VIEW CONTENT

  generateHighlight(highlight) {
    // Clone template
    const template = document.querySelector("#highlight-template");
    const clone = template.content.cloneNode(true);

    // Populate template with highlight data
    clone.querySelector(".highlight").setAttribute("data-id", highlight.id);
    clone.querySelector(".highlight-metadata").textContent = highlight.metadata;
    clone.querySelector(".highlight-text").textContent = highlight.text;
    clone.querySelector(".separator").textContent = '==========';

    // Mark as duplicate TODO: rework
    if (highlight.duplicates !== 0) {
      highlight.duplicates.forEach(duplicate => {
        clone.querySelector(".separator").textContent += ` 🚨 (id: ${duplicate.id})`;
      });
    }
    // TODO: ADD ACTION AND EVENT LISTENERS
    //   // Set event listeners to highlights and actions
    //   clone.querySelector(".highlight-text").addEventListener("mousedown", (event) => {
    //   this.copyToClipboard(highlight.textEdited || highlight.text)
    //   this.viewFlash(event.currentTarget);
    //   })

    // clone.querySelector(".highlight-metadata").addEventListener("mousedown", (event) => {
    //   this.copyToClipboard(highlight.original + this.settings.separator) // TODO: handle case if edited
    //   this.viewFlash(event.currentTarget.parentElement);
    // })

    // clone.querySelector(".action-copy").addEventListener("click", (event) => {
    //   const id = event.target.closest(".highlight").dataset.id;
    //   this.copyToClipboard(highlight.text);
    // });

    // clone.querySelector(".action-edit").addEventListener("click", (event) => {
    //   event.target.innerText = 'Save';
    //   event.target.parentElement.querySelector(".highlight-text").setAttribute("contentEditable", "true");
    // });

    // clone.querySelector(".action-delete").addEventListener("click", (event) => {
    //   const id = event.target.closest(".highlight").dataset.id;
    //   this.deleteHighlight(highlight);
    //   if (highlight.deleted) {
    //     const id = event.target.closest(".highlight").remove();
    //   }
    // });
    return clone;
  }

  generateHighlights(highlights) {
    const fragment = new DocumentFragment;
    highlights.forEach(highlight => {
      fragment.appendChild(this.generateHighlight(highlight));
    });
    return fragment;
  }

  displayViewFromBook(book) {

  }



  // ##############

  viewSource(source) {
    //  TODO: REWORK TO DISPLAY NOT JUST TEXT BUT HIGHLIGHTS FROM SOURCE
    const viewContainer = document.querySelector("#view-content");

    // Clear view
    viewContainer.innerHTML = "";

    // Insert uploads contained in instance variable as text
    viewContainer.innerText += source.text;

    // Update title with number of files
    this.viewSourceHeader(source)
  }

  viewHighlights(highlights = this.highlights) {
    const template = document.querySelector("#highlight-template");
    const viewContainer = document.querySelector("#view-content");

    // Clear view
    viewContainer.innerHTML = "";

    // Insert highlights contained in instance variable using content template
    highlights.forEach((highlight) => {
      // Populate template with highlight data
      const clone = template.content.cloneNode(true);
      clone.querySelector(".highlight").setAttribute("data-id", highlight.id);
      clone.querySelector(".highlight-metadata").textContent = highlight.metadata;
      clone.querySelector(".highlight-text").textContent = highlight.text;
      clone.querySelector(".separator").textContent = '==========';

      // [TESTING] TODO:REMOVE
      highlight.duplicates.forEach(duplicate => {
        clone.querySelector(".separator").textContent += ` 🚨 (id: ${duplicate.id})`;
      });

      // Set event listeners to highlights and actions
      clone.querySelector(".highlight-text").addEventListener("mousedown", (event) => {
        this.copyToClipboard(highlight.textEdited || highlight.text)
        this.viewFlash(event.currentTarget);
      })

      clone.querySelector(".highlight-metadata").addEventListener("mousedown", (event) => {
        this.copyToClipboard(highlight.original + this.settings.separator) // TODO: handle case if edited
        this.viewFlash(event.currentTarget.parentElement);
      })

      clone.querySelector(".action-copy").addEventListener("click", (event) => {
        const id = event.target.closest(".highlight").dataset.id;
        this.copyToClipboard(highlight.text);
      });

      clone.querySelector(".action-edit").addEventListener("click", (event) => {
        event.target.innerText = 'Save';
        event.target.parentElement.querySelector(".highlight-text").setAttribute("contentEditable", "true");
      });

      clone.querySelector(".action-delete").addEventListener("click", (event) => {
        const id = event.target.closest(".highlight").dataset.id;
        this.deleteHighlight(highlight);
        if (highlight.deleted) {
          const id = event.target.closest(".highlight").remove();
        }
      });

      // Insert highlight into DOM
      viewContainer.appendChild(clone);
    });
  }

  viewBookHeader(book) {
    const header = document.querySelector("#view-header");
    header.innerText = `${book.title} (${book.highlights.length} highlight${book.highlights.length > 1 ? "s" : ""})`;
  }

  viewSourceHeader(source) {
    const header = document.querySelector("#view-header");
    header.innerText = `Source #${source.id} '${source.filename}'`;
  }

  viewHighlightsOfBook(book) {
    const highlights = this.findHighlightsFromBook(book);
    this.viewHighlights(highlights);

    // Update title with number of highlights
    this.viewBookHeader(book);

    const actionsContainer = document.querySelector("#view-actions");
    actionsContainer.innerHTML = "";

    // Add copy action
    const copyButton = document.createElement("button");
    copyButton.innerText = "Copy";
    copyButton.addEventListener("click", (event) => {
      const output = this.generateOutput(book);
      this.copyToClipboard(output);
      this.viewFlash(event.currentTarget.closest("#view"))
    });
    actionsContainer.appendChild(copyButton);

    // Add download action
    const downloadButton = document.createElement("button");
    downloadButton.innerText = "Download";
    downloadButton.addEventListener("click", () => {
      const output = this.generateOutput(book);
      this.downloadFile(`${book.title}.txt`, output);
    });
    actionsContainer.appendChild(downloadButton);

    // Add scan for duplicate text
    const scanTextButton = document.createElement("button");
    scanTextButton.innerText = "Scan duplicate text";
    scanTextButton.addEventListener("click", () => {
      this.viewDuplicatesOfBook(book);
    });
    actionsContainer.appendChild(scanTextButton);

    // Add scan for duplicate locations
    const scanLocationButton = document.createElement("button");
    scanLocationButton.innerText = "Scan duplicate location";
    scanLocationButton.addEventListener("click", () => {
      // this.viewDuplicatesOfBook(book);
    });
    actionsContainer.appendChild(scanLocationButton);

    // Scroll to top
    document.querySelector("#view").scrollTo(0, 0);
  }

  viewFlash(element) {
    element.style.backgroundColor = "#F8D6A0";
    setTimeout(() => {
      element.style.transitionDuration = "0.6s";
      element.transitionTimingFunction = "ease-in";
      element.style.backgroundColor = null;
    }, 20);
    setTimeout(() => {
      element.style.transitionDuration = null;
      element.transitionTimingFunction = null;
    }, 620);
  }

  viewDuplicatesOfBook(book) {
    this.scanForDuplicates(book.highlights);
    console.log("done");
    this.viewHighlightsOfBook(book);
  }


  // UTILITIES & CHECKS

  copyToClipboard(text) {
    window.navigator.clipboard.writeText(text);
    console.log(`Copied to clipboard:\n${text}`);
  }

  checkForCommonSubstring(string1, string2, threshold = 50) {
    // Adapted from slebetman (http://stackoverflow.com/a/13007065/1763297)

    // Identify smaller string
    const smallString = string1.length <= string2.length ? string1 : string2;
    const bigString = string1.length <= string2.length ? string2 : string1;

    // Search possible substrings from largest to smallest:
    for (let i = smallString.length; i >= threshold; i--) {
      for (let j = 0; j <= (smallString.length - i); j++) {
        let substring = smallString.substr(j,i);
        let k = bigString.indexOf(substring);
        if (k != -1) {
          return {
            found: true,
            substring: substring,
            smallStringIndex: j,
            bigStringIndex: k
          }
        }
      }
    }
    return {
      found : false
    }
  }

  state() {
    console.log(`*--State--*`
      + `\n${this.sources.length} uploads`
      + `\n${this.highlights.length} highlights (${this.findDeletedHighlights().length} deleted, ${this.findEditedHighlights().length} edited)`
      + `\n${this.books.length} books`
    )
  }

  runTests() {
    // TODO: Write tests to compare number of highlights/books on display with objects in memory
  }

  // EXPERIMENTAL

  insertMark(text, start, end) {
    return text.slice(0,start) + "<mark>" + text.slice(start, end) + "</mark>" + text.slice(end)
  }
}

const app = new App
