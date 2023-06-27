class App {
  constructor() {
    // Confirm whether app.js is connected
    document.addEventListener("DOMContentLoaded", () => {
      console.log("app.js connected")
    });
    this.initializeSettings();
    this.initializeData();
    this.initializeUI();
  }

  // APP

  initializeSettings() {
    this.settings = {
      separator: "\r\n==========\r\n",
      duplicateSubstringLength: 40
    };
  }

  initializeData() {
    this.sources = []; // Contains objects representing raw source strings from 'my clippings.txt' files
    this.highlights = []; // Contains objects representing individual highlights
    this.books = []; // Contains objects representing distinct books
    // this.marked
    // this.edited
    // this.duplicates
    this.deleted = [];
    // this.bookmarks
    // this.notes
    this.id = 0; // Unique id assign to object (of any kind)
    this.view = {
      header: {
        text: "",
        count: null
      },
      actions: [],
      content: []
    }
  }

  initializeUI() {
    document.querySelector("#reset").addEventListener("click", () => {
      // Reset data
      this.initializeData();
      this.renderMenu();
      this.clearView();
    }
    );

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

  assignId() {return this.id += 1}

  // findElementById(id) {
  //   return document.querySelector(`[data-id="${id}"]`)
  // }

  // FILES

  readFile(file) {
    const reader = new FileReader();

    // Add a listener for the file load
    reader.addEventListener("load", (event) => {

      // Create source and add to sources
      const source = {
        id: this.assignId(),
        filename: file.name,
        text: event.target.result,
        highlights: []
      };
      this.sources.push(source)
      console.log(`File '${source.filename}' imported`);

      // Extract data from source
      this.extractDataFromSource(source);
    });
    reader.readAsText(file);
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

  // SOURCES

  extractDataFromSource(source) {
    // Analyse sources to populate highlights and books, update view
    this.extractHighlightsFromSource(source);
    this.sortBooksAlphabet();
    this.renderMenu();
    this.clearView();
    this.state();
  }

  extractHighlightsFromSource(source) {
    const clippings = source.text.split(/\s*==========\s*/);
    clippings.forEach((clipping) => {
      if (clipping) return this.createHighlight(clipping);
    });
  }

  // BOOKS

  createBook(highlight) {
    const book = {
      id: this.assignId(),
      title: highlight.title,
      author: highlight.author,
      highlights: []
    }
    this.books.push(book);
    return book;
  }

  findBookOfHighlight(highlight) {
    return this.books.find(book => {
      return (book.title === highlight.title) && (book.author === highlight.author)
    });
  }

  findOrCreateBook(highlight) {
    return this.findBookOfHighlight(highlight) || this.createBook(highlight);
  }

  sortBooksAlphabet() {
    this.books.sort((a, b) => {return a.title.localeCompare(b.title)});
  }

  // HIGHLIGHTS

  createHighlight(clipping) {
    // Parse clipping and create highlight object
    const regex = /(?<title>[\S ]+) (?:- (?<authorAlt>[\w ]+)|\((?<author>[^(]+)\))\s*- Your (?<type>\w+) on page (?<pageStart>\d*)-?(?<pageEnd>\d*)(?: \| location (?<locationStart>\d+)-?(?<locationEnd>\d*))? \| Added on (?<date>[\S ]*)\s*(?<text>.*)\s*/
    const highlight = clipping.match(regex).groups

    // Save original clipping and metadata
    highlight.original = clipping;
    highlight.metadata = clipping.split(/(\r?\n)/).slice(0,3).join('');

    // Assign unique id
    highlight.id = this.assignId();

    // Initialise duplicates array
    highlight.duplicates = [];

    // Find existing book or create new book
    const book = this.findOrCreateBook(highlight);

    // Assign book to highlight
    highlight.book = book;

    // Push into highlights
    this.highlights.push(highlight);

    // Push to last imported source
    this.sources.slice(-1)[0].highlights.push(highlight);

    // Push to book
    book.highlights.push(highlight);

    return highlight;
  }

  createOutput(highlights) {
    const clippings = highlights.map(highlight => {
      const text = highlight.textEdited || highlight.text;
      return `${highlight.metadata}\r\n\r\n${text}`;
    });
    const output = clippings.join(this.settings.separator) + this.settings.separator;
    return output
  }

  deleteHighlight(highlight) {
    if (!highlight.deleted) {
      highlight.deleted = true;
      highlight.marked = false;
      this.deleted.push(highlight);
      this.renderMenu();
      this.view.header.count--;
      this.renderViewHeader(this.view.header);
    }
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

  countHighlights(highlights) {
    return highlights.filter(h => !h.deleted).length;
  }

  countDeletedHighlights(highlights) {
    return highlights.filter(h => h.deleted).length;
  }

  // # COMPONENTS

  // ## MENU

  renderMenu() {
    if (this.highlights.length === 0) {
      this.renderDropInstructions();
      document.querySelector("#booklist").innerHTML = "";
      document.querySelector("#smartlists").innerHTML = "";
      document.querySelector("#sourcelist").innerHTML = "";
    } else {
      this.hideDropInstructions();
      this.renderBookList();
      this.renderSmartLists();
      this.renderSourceList();
    }
  }

  renderDropInstructions() {
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

    // Add books as list items
    this.books.forEach(book => {
      const bookItem = document.createElement("li");
      bookItem.setAttribute("data-id", book.id);
      bookItem.textContent = book.title;

      const countElement = document.createElement("span");
      countElement.classList.add("count");
      countElement.textContent = this.countHighlights(book.highlights);
      bookItem.appendChild(countElement);

      // Add event listener to display books and toggle active
      bookItem.addEventListener("click", (event) => {
        this.viewBook(book);
        this.removeActiveMenu();
        event.currentTarget.classList.add("active");
      });

      clone.querySelector("ul").appendChild(bookItem);
    });

    return clone
  }

  renderBookList() {
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
    this.sources.forEach((source, index) => {
      const sourceItem = document.createElement("li");
      sourceItem.setAttribute("data-id", source.id);
      const count = this.countHighlights(source.highlights);
      sourceItem.textContent = `${index + 1}. ` + source.filename + ` (${count})`;

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

  renderSourceList() {
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
        text: `all marked (${0})`,
        callback: () => {console.log("TEST MARKED!")}
      },
      {
        id: "editedlist",
        text: `all edited (${0})`,
        callback: () => {console.log("TEST EDITED!")}
      },
      {
        id: "duplicatelist",
        text: `all duplicates (${0})`,
        callback: () => {console.log("TEST DUPLICATES!")}
      },
      {
        id: "deletedlist",
        text: `all deleted (${this.countDeletedHighlights(this.deleted)})`,
        callback: () => this.viewDeleted()
      },
      {
        id: "bookmarklist",
        text: `all bookmarks (${0})`,
        callback: () => {console.log("TEST BOOKMARKS!")}
      },
      {
        id: "notelist",
        text: `all notes (${0})`,
        callback: () => {console.log("TEST NOTES!")}
      },
    ];

    // Add lists as list items
    lists.forEach(list => {
      const item = document.createElement("li");
      item.id = list.id;
      item.textContent = list.text;
      item.addEventListener("click", (event) => {
        list.callback();
        this.removeActiveMenu();
        event.currentTarget.classList.add("active");
      });
      clone.querySelector("ul").appendChild(item);
    });

    return clone
  }

  renderSmartLists() {
    const smartLists = document.querySelector("#smartlists");
    smartLists.innerHTML = "";
    smartLists.appendChild(this.generateSmartLists());
  }

  // ## VIEW

  renderView() {
    // Render view from app state
    this.renderViewHeader(this.view.header);
    this.renderViewActions(this.view.actions);
    this.renderViewContent(this.view.content);
  }

  renderViewHeader(header) {
    const countElement = document.createElement("span");
    countElement.id = "header-count";
    countElement.classList.add("count");
    countElement.textContent = header.count

    const headerElement = document.querySelector("#view-header");
    headerElement.textContent = header.text;
    headerElement.appendChild(countElement);
  }

  renderViewActions(actions) {
    const actionsContainer = document.querySelector("#view-actions");
    actionsContainer.innerHTML = "";

    actions.forEach(action => {
      const button = document.createElement("button");
      button.textContent = `${action.text}`;
      button.addEventListener("click", action.callback);
      actionsContainer.appendChild(button);
    });
  }

  renderViewContent(highlights) {
    const contentContainer = document.querySelector("#view-content");
    contentContainer.innerHTML = "";
    const content = this.generateHighlights(highlights);
    contentContainer.appendChild(content);
  }

  clearView() {
    this.view.header = {};
    this.view.actions = [];
    this.view.content = [];
  }

  generateViewFromBook(book) {
    return {
      header: this.generateHeaderFromBook(book),
      actions: this.generateActions(),
      content: book.highlights.filter(h => !h.deleted)
    }
  }

  viewBook(book) {
    this.view = this.generateViewFromBook(book);
    this.renderView();
  }

  generateViewFromSource(source) {
    return {
      header: this.generateHeaderFromSource(source),
      actions: this.generateActions(),
      content: source.highlights.filter(h => !h.deleted)
    }
  }

  viewSource(source) {
    this.view = this.generateViewFromSource(source);
    this.renderView();
  }

  generateDeletedView() {
    return {
      header: {
        text: "Deleted",
        count: this.deleted.length
      },
      actions: this.generateActions(),
      content: this.deleted
    }
  }

  viewDeleted() {
    this.view = this.generateDeletedView();
    this.renderView();
  }

  generateActions() {
    return [
      {
        text: "Copy",
        callback: () => {console.log('COPY!')},
      },
      {
        text: "Download",
        callback: () => {console.log('DOWNLOAD!')},
      }
    ]
  }

  // ### VIEW HEADER

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
    // if (highlight.duplicates !== 0) {
    //   highlight.duplicates.forEach(duplicate => {
    //     clone.querySelector(".separator").textContent += ` 🚨 (id: ${duplicate.id})`;
    //   });
    // }
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
    //   const id = event.currentTarget.closest(".highlight").dataset.id;
    //   this.copyToClipboard(highlight.text);
    // });

    // clone.querySelector(".action-edit").addEventListener("click", (event) => {
    //   event.currentTarget.innerText = 'Save';
    //   event.currentTarget.parentElement.querySelector(".highlight-text").setAttribute("contentEditable", "true");
    // });

    clone.querySelector(".action-delete").addEventListener("click", event => {
      if (this.deleteHighlight(highlight)) {
        // highlightElement.remove();
        event.currentTarget.closest(".highlight").remove();
      }
    });
    return clone;
  }

  generateHighlights(highlights) {
    const fragment = new DocumentFragment;
    highlights.forEach(highlight => {
      fragment.appendChild(this.generateHighlight(highlight));
    });
    return fragment;
  }

  generateHeaderFromBook(book) {
    return {
      text: book.title,
      count: this.countHighlights(book.highlights)
    }
  }

  // TODO: OBSOLETE
  renderHeaderFromBook(book) {
    document.querySelector("#view-header").innerText = this.generateHeaderFromBook(book);
  }

  // renderViewFromBook(book) {

  //   const template = document.querySelector("#view-template");
  //   const clone = template.content.cloneNode(true);

  //   // Update header
  //   clone.querySelector("#view-header").innerText = this.generateHeaderFromBook(book);

  //   // TODO update actions
  //   // clone.querySelector("#view-actions").appendChild();
  //   // TODO scroll to top

  //   // Update content
  //   const content = this.generateHighlights(book.highlights);
  //   clone.querySelector("#view-content").appendChild(content);

  //   const view = document.querySelector("#view");
  //   view.innerHTML = "";

  //   view.appendChild(clone)
  // }

  generateHeaderFromSource(source) {
    const count = this.countHighlights(source.highlights);
    return `Source '${source.filename}' (${count} highlight${count > 1 ? "s" : ""})`
  }


  // ##############

  // viewSource(source) {
  //   //  TODO: REWORK TO DISPLAY NOT JUST TEXT BUT HIGHLIGHTS FROM SOURCE
  //   const viewContainer = document.querySelector("#view-content");

  //   // Clear view
  //   viewContainer.innerHTML = "";

  //   // Insert uploads contained in instance variable as text
  //   viewContainer.innerText += source.text;

  //   // Update title with number of files
  //   this.viewSourceHeader(source)
  // }

  // OBSOLETE
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
        const id = event.currentTarget.closest(".highlight").dataset.id;
        this.copyToClipboard(highlight.text);
      });

      clone.querySelector(".action-edit").addEventListener("click", (event) => {
        event.currentTarget.innerText = 'Save';
        event.currentTarget.parentElement.querySelector(".highlight-text").setAttribute("contentEditable", "true");
      });

      // clone.querySelector(".action-delete").addEventListener("click", (event) => {
      //   this.deleteHighlight(highlight);
      //   if (highlight.deleted) {
      //     event.currentTarget.closest(".highlight").remove();
      //   }
      // });

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

  // viewHighlightsOfBook(book) {
  //   this.viewHighlights(book.highlights);

  //   // Update title with number of highlights
  //   this.viewBookHeader(book);

  //   const actionsContainer = document.querySelector("#view-actions");
  //   actionsContainer.innerHTML = "";

  //   // Add copy action
  //   const copyButton = document.createElement("button");
  //   copyButton.innerText = "Copy";
  //   copyButton.addEventListener("click", (event) => {
  //     const output = this.createOutput(book.highlights);
  //     this.copyToClipboard(output);
  //     this.viewFlash(event.currentTarget.closest("#view"))
  //   });
  //   actionsContainer.appendChild(copyButton);

  //   // Add download action
  //   const downloadButton = document.createElement("button");
  //   downloadButton.innerText = "Download";
  //   downloadButton.addEventListener("click", () => {
  //     const output = this.createOutput(book.highlights);
  //     this.downloadFile(`${book.title}.txt`, output);
  //   });
  //   actionsContainer.appendChild(downloadButton);

  //   // Add scan for duplicate text
  //   const scanTextButton = document.createElement("button");
  //   scanTextButton.innerText = "Scan duplicate text";
  //   scanTextButton.addEventListener("click", () => {
  //     this.viewDuplicatesOfBook(book);
  //   });
  //   actionsContainer.appendChild(scanTextButton);

  //   // Add scan for duplicate locations
  //   const scanLocationButton = document.createElement("button");
  //   scanLocationButton.innerText = "Scan duplicate location";
  //   scanLocationButton.addEventListener("click", () => {
  //     // this.viewDuplicatesOfBook(book);
  //   });
  //   actionsContainer.appendChild(scanLocationButton);

  //   // Scroll to top
  //   document.querySelector("#view").scrollTo(0, 0);
  // }

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

  // viewDuplicatesOfBook(book) {
  //   this.scanForDuplicates(book.highlights);
  //   console.log("done");
  //   this.viewHighlightsOfBook(book);
  // }


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
      + `\n${this.highlights.length} highlights (${this.findDeletedHighlights(this.highlights).length} deleted, ${this.findEditedHighlights(this.highlights).length} edited)`
      + `\n${this.books.length} books`
    )
  }


  // EXPERIMENTAL

  insertMark(text, start, end) {
    return text.slice(0,start) + "<mark>" + text.slice(start, end) + "</mark>" + text.slice(end)
  }

  // TESTING

  findHighlightsFromBook(book) {
    return this.highlights.filter(highlight => ((highlight.title === book.title) && !highlight.deleted));
  }

  findEditedHighlights(highlights) {
    return highlights.filter(highlight => (highlight.textEdited));

  }
  findDeletedHighlights(highlights) {
    return highlights.filter(highlight => (highlight.deleted));
  }

  time(code) {
    const startTime = performance.now();
    eval(code);
    const endTime = performance.now();
    const measure = endTime - startTime
    console.log(`${measure} ms`);
    return measure
  }

  runTests() {
    // TODO: Write tests to compare number of highlights/books on display with objects in memory
    // TODO: Compare highlights in book.highlights with findHighlightsFromBook(book)
    // TODO: same for edited, deleted, marked and duplicates
    // TODO: Do all books have a title and an author?
    // TODO: Do all highlights have a book?
  }
}

const app = new App
