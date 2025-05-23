class App {
  constructor() {
    // Confirm whether app.js is connected
    document.addEventListener("DOMContentLoaded", () => console.log("app.js connected"));
    this.initializeSettings();
    this.initializeData();
    this.initializeUI();
  }

  // APP

  initializeSettings() {
    this.settings = {
      separator: "\r\n==========\r\n",
      similarSubstringLength: 40,
      hideMetadata: false, // Experimental
      keyboardNavigation: true, // Experimental
      numClipPerPage: 50 // Experimental
    };
  }

  initializeData() {
    this.sources = []; // Contains objects representing raw source strings from 'my clippings.txt' files
    this.clippings = []; // Contains objects representing individual clippings
    this.books = []; // Contains objects representing distinct books
    this.marked = [];
    this.edited = [];
    this.originals = [];
    this.duplicates = [];
    this.deleted = [];
    this.highlights = [];
    this.bookmarks = [];
    this.notes = [];
    this.id = 0; // Unique id assign to object (of any kind)
    this.view = {
      header: {
        text: "",
        count: null
      },
      actions: [],
      content: [],
      scrollPosition: 0,
      downloadFileName: "Download"
    }
  }

  initializeUI() {
    this.renderMenu();
    this.clearView();

    document.querySelector("#reset").addEventListener("click", () => {
      // Reset data
      this.initializeData();
      this.renderMenu();
      this.clearView();
    }
    );

    // Initialize drag-and-drop area
    const dropArea = document.querySelector("#menu")
    dropArea.addEventListener("dragenter", () => {
      dropArea.style.backgroundColor = "#F8D6A0";
    });
    dropArea.addEventListener("dragleave", () => {
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
      this.readFilesFromDrop(event);
    });

    if (this.settings.keyboardNavigation) {
      this.initializeKeyboardNavigation();
    }
  }

  assignId() {return this.id += 1}

  // findElementById(id) {
  //   return document.querySelector(`[data-id="${id}"]`)
  // }

  // FILES

  readFilesFromDrop(event) {
    // Read each dropped file upon drop event using dataTransfer
    const files = event.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      this.readFile(files.item(i));
    }
  }

  readFile(file) {
    const reader = new FileReader();

    // Add a listener for the file load
    reader.addEventListener("load", (event) => {

      // Get text from file
      const text = event.target.result;

      // Check if source has already been imported
      // const check = this.findSourceFromText(text);
      // if (check) {
      //   console.log(`Source already exists (id: ${check.id})`);
      // } else {}

      // Create source and add to sources
      const source = {
        id: this.assignId(),
        filename: file.name,
        text: event.target.result,
        clippings: []
      };
      this.sources.push(source)
      console.log(`File '${source.filename}' imported`);

      // Extract data from source
      this.extractDataFromSource(source);
    });
    reader.readAsText(file);
  }

  findSourceFromText(text) {
    return this.sources.find(source => (source.text === text));
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

  addTxtExtension(filename) {
    if (filename.substr(filename.length - 4) === ".txt") {
      return filename
    }
    return filename + '.txt'
  }

  // SOURCES

  extractDataFromSource(source) {
    // Analyse sources to populate clippings and books, update view
    this.extractClippingsFromSource(source);
    this.sortBooksAlphabet();
    this.renderMenu();
    this.viewSource(source);
    this.state();
  }

  extractClippingsFromSource(source) {
    const fragments = source.text.split(/\s*==========\s*/);
    fragments.forEach(text => {
      if (text) return this.createClipping(text);
    });
  }

  // BOOKS

  createBook(clipping) {
    const book = {
      id: this.assignId(),
      title: clipping.title,
      author: clipping.author,
      clippings: []
    }
    this.books.push(book);
    return book;
  }

  findBookOfClipping(clipping) {
    return this.books.find(book => {
      return (book.title === clipping.title) && (book.author === clipping.author)
    });
  }

  findOrCreateBook(clipping) {
    return this.findBookOfClipping(clipping) || this.createBook(clipping);
  }

  sortBooksAlphabet() {
    this.books.sort((a, b) => {return a.title.localeCompare(b.title)});
  }

  // CLIPPINGS

  createClipping(text) {
    // Parse text and create clipping object
    const regex = /(?<title>[\S ]+) (?:- (?<authorAlt>[\w ]+)|\((?<author>[^(]+)\))\s*- Your (?<type>\w+) on page (?<pageStart>\d*)-?(?<pageEnd>\d*)(?: \| location (?<locationStart>\d+)-?(?<locationEnd>\d*))? \| Added on (?<date>[\S ]*)\s*(?<text>.*)\s*/;
    const clipping = text.match(regex).groups;

    // Save raw text and metadata
    clipping.raw = text;
    clipping.metadata = text.split(/(\r?\n)/).slice(0, 3).join('');

    // Set author in case of alternative format (' - ' instead of ' ()')
    clipping.author = clipping.author || clipping.authorAlt;

    // Initialise similar array
    clipping.similar = [];

    // Assign book (existing or new)
    clipping.book = this.findOrCreateBook(clipping);

    // Assign unique id
    clipping.id = this.assignId();

    // Check for duplicate clipping in memory
    clipping.original = this.findOriginalClipping(clipping);

    // Push clipping to relevant arrays for tracking
    this.assignClipping(clipping);

    return clipping;
  }

  findOriginalClipping(clipping) {
    const identical = this.clippings.find(c => c.raw === clipping.raw && !c.original);
    if (identical) {
      this.duplicates.push(clipping)
    } else {
      this.originals.push(clipping)
    }
    return identical
  }

  assignClipping(clipping) {
    // Push to main clippings array
    this.clippings.push(clipping);

    // Assign to last source
    this.sources.slice(-1)[0].clippings.push(clipping);

    // Assign to book
    clipping.book.clippings.push(clipping);

    // Assign to clipping type array
    if (clipping.type === "Highlight") {
      this.highlights.push(clipping);
    } else if (clipping.type === "Bookmark") {
      this.bookmarks.push(clipping);
    } else if (clipping.type === "Note") {
      this.notes.push(clipping);
    }
  }

  createOutput(clippings) {
    const existingClippings = clippings.filter(h => !h.deleted);
    const fragments = existingClippings.map(h => this.generateFragment(h));
    return fragments.join('');
  }

  generateFragment(clipping) {
    const text = clipping.textEdited || clipping.text;
    return [clipping.metadata, "\r\n\r\n", text, this.settings.separator].join('');
  }

  deleteClipping(clipping) {
    if (!clipping.deleted) {
      clipping.deleted = true;
      this.unmarkClipping(clipping);
      this.deleted.push(clipping);
      this.renderMenu();
      this.view.header.count--;
      this.renderViewHeader(this.view.header);
    }
    return clipping;
  }

  undeleteClipping(clipping) {
    if (clipping.deleted) {
      clipping.deleted = false;

      // Find index of clipping in deleted array
      const index = this.deleted.findIndex(h => h === clipping);

      // Remove clipping from array (mutation)
      this.deleted.splice(index, 1);
      this.renderMenu();
      this.view.header.count++;
      this.renderViewHeader(this.view.header);
    }
    return clipping;
  }

  markClipping(clipping) {
    if (!clipping.marked && !clipping.deleted ) {
      clipping.marked = true;
      this.marked.push(clipping);
      this.renderMenu();
    }
    return clipping;
  }

  unmarkClipping(clipping) {
    if (clipping.marked) {
      clipping.marked = false;

      // Find index of clipping in marked array
      const index = this.marked.findIndex(h => h === clipping);

      // Remove clipping from array (mutation)
      this.marked.splice(index, 1);
      this.renderMenu();
    }
    return clipping;
  }

  similarCompare(clipping1, clipping2) {
    const check = this.checkForCommonSubstring(clipping1.text, clipping2.text, this.settings.similarSubstringLength);
    if (check.found) {
      // Link similar clippings
      clipping1.similar.push(clipping2);
      clipping2.similar.push(clipping1);
    }
    return check
  }

  scanForSimilars(clippings) {
    const n = clippings.length;

    // Compare each clipping with all the others once
    for (let i = 0; i <= n - 1; i++) {
      for (let j = i + 1; j <= n - 1; j++) {
        this.similarCompare(clippings[i], clippings[j])

        // [TESTING]
        // Count number of times a clipping has been tested (should equal n - 1)
        clippings[i].tested = clippings[i].tested + 1 || 1;
        clippings[j].tested = clippings[j].tested + 1 || 1;
      }
    }
  }

  countClippings(clippings) {
    return clippings.filter(h => !h.deleted).length;
  }

  countDeletedClippings(clippings) {
    return clippings.filter(h => h.deleted).length;
  }

  // # COMPONENTS

  // ## MENU

  renderMenu() {
    if (this.clippings.length === 0) {
      this.renderDropInstructions();
      this.hideMenuLists();
    } else {
      this.hideDropInstructions();
      this.renderMenuLists()
    }
  }

  renderDropInstructions() {
    document.querySelector("#drop-instructions").style.display = "flex";
  }

  hideDropInstructions() {
    document.querySelector("#drop-instructions").style.display = "none";
  }

  renderMenuLists() {
    this.renderBookList();
    this.renderSmartLists();
    this.renderSourceList();
  }

  hideMenuLists() {
    document.querySelector("#booklist").classList.add("none");
    document.querySelector("#smartlists").classList.add("none");
    document.querySelector("#sourcelist").classList.add("none");
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
    clone.querySelector("#booklist-header").innerText = `books (${this.books.length})`;

    // Add books as list items
    this.books.forEach(book => {
      const bookItem = document.createElement("li");
      bookItem.setAttribute("data-id", book.id);
      bookItem.textContent = book.title;

      const countElement = document.createElement("span");
      countElement.classList.add("count");
      countElement.textContent = this.countClippings(book.clippings);
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
    bookList.classList.remove("none");
    bookList.appendChild(this.generateBookList());
  }

  // ### SOURCE LIST

  generateSourceList() {
    // Clone template
    const template = document.querySelector("#sourcelist-template");
    const clone = template.content.cloneNode(true);

    // Update header with total number of sources
    clone.querySelector("#sourcelist-header").innerText = `sources (${this.sources.length})`

    // Add sources as list items
    this.sources.forEach((source, index) => {
      const sourceItem = document.createElement("li");
      sourceItem.setAttribute("data-id", source.id);
      const count = this.countClippings(source.clippings);
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
    sourceList.classList.remove("none");
    sourceList.appendChild(this.generateSourceList());
  }

  // ### SMART LISTS

  generateSmartLists() {
    // Clone template
    const template = document.querySelector("#smartlists-template");
    const clone = template.content.cloneNode(true);

    // Update header
    clone.querySelector("#smartlists-header").innerText = `lists`

    const lists = [
      {
        id: "clippinglist",
        text: `clippings (${this.countClippings(this.clippings)})`,
        callback: () => this.viewClippings()
      },
      {
        id: "highlightlist",
        text: `highlights (${this.countClippings(this.highlights)})`,
        callback: () => this.viewHighlights()
      },
      {
        id: "bookmarklist",
        text: `bookmarks (${this.countClippings(this.bookmarks)})`,
        callback: () => this.viewBookmarks()
      },
      {
        id: "notelist",
        text: `notes (${this.countClippings(this.notes)})`,
        callback: () => this.viewNotes()
      },
      {
        id: "markedlist",
        text: `marked (${this.countClippings(this.marked)})`,
        callback: () => this.viewMarked()
      },
      {
        id: "editedlist",
        text: `edited (${this.countClippings(this.edited)})`,
        callback: () => this.viewEdited()
      },
      {
        id: "originallist",
        text: `originals (${this.countClippings(this.originals)})`,
        callback: () => this.viewOriginals()
      },
      {
        id: "duplicatelist",
        text: `duplicates (${this.countClippings(this.duplicates)})`,
        callback: () => this.viewDuplicates()
      },
      {
        id: "deletedlist",
        text: `deleted (${this.countDeletedClippings(this.deleted)})`,
        callback: () => this.viewDeleted()
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
    smartLists.classList.remove("none");
    smartLists.appendChild(this.generateSmartLists());
  }

  // ## VIEW

  renderView() {
    const viewElement = document.querySelector("#view");

    // Scroll to top
    viewElement.scrollTo(0, 0);

    // Reset scroll event listener
    viewElement.removeEventListener("scroll", event => this.loadNextContent(event));
    viewElement.addEventListener("scroll", event => this.loadNextContent(event));

    // Render view from app state
    this.renderViewHeader(this.view.header);
    this.renderViewActions(this.view.actions);
    this.renderViewContent(this.view.content);
    if (this.settings.hideMetadata) this.hideMetadata();
  }

  loadNextContent(event) {
    const checkScroll = (event.currentTarget.scrollTop >= event.currentTarget.scrollHeight - window.innerHeight - 100);
    if (checkScroll) {
      this.renderViewContent(this.view.content, {append: true})
    }
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

  renderViewContent(clippings, options = {}) {
    const contentContainer = document.querySelector("#view-content");

    // Unless option 'append' is true, empty content and reset render scroll position
    if (!options.append) {
      contentContainer.innerHTML = "";
      this.view.scrollPosition = 0;
    }

    // Slice the clippings to render (for performance)
    const start = this.view.scrollPosition;
    const end = start + this.settings.numClipPerPage;
    const clippingsBatch = clippings.slice(start, end);

    // Generate clippings and append to DOM
    const content = this.generateClippings(clippingsBatch);
    contentContainer.appendChild(content);

    // Update scroll position
    this.view.scrollPosition = end;
  }

  clearView() {
    this.view.header = {};
    this.view.actions = [];
    this.view.content = [];
    document.querySelector("#view-header").innerHTML = "";
    document.querySelector("#view-actions").innerHTML = "";
    document.querySelector("#view-content").innerHTML = "";
  }

  generateViewFromBook(book) {
    return {
      header: this.generateHeaderFromBook(book),
      actions: this.generateActions(),
      content: book.clippings,
      downloadFileName: book.title
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
      content: source.clippings,
      downloadFileName: source.filename
    }
  }

  viewSource(source) {
    this.view = this.generateViewFromSource(source);
    this.renderView();
  }

  generateViewClippings() {
    return {
      header: {
        text: "Clippings",
        count: this.clippings.length
      },
      actions: this.generateActions(),
      content: this.clippings,
      downloadFileName: "Clippings"
    }
  }

  viewClippings() {
    this.view = this.generateViewClippings();
    this.renderView();
  }

  generateViewDeleted() {
    return {
      header: {
        text: "Deleted",
        count: this.deleted.length
      },
      actions: this.generateActions(),
      content: this.deleted,
      downloadFileName: "Deleted"
    }
  }

  viewDeleted() {
    this.view = this.generateViewDeleted();
    this.renderView();
  }

  generateViewBookmarks() {
    return {
      header: {
        text: "Bookmarks",
        count: this.bookmarks.filter(b => !b.deleted).length
      },
      actions: this.generateActions(),
      content: this.bookmarks,
      downloadFileName: "Bookmarks"
    }
  }

  viewBookmarks() {
    this.view = this.generateViewBookmarks();
    this.renderView();
  }

  generateViewHighlights() {
    return {
      header: {
        text: "Highlights",
        count: this.highlights.filter(h => !h.deleted).length
      },
      actions: this.generateActions(),
      content: this.highlights,
      downloadFileName: "Highlights"
    }
  }

  viewHighlights() {
    this.view = this.generateViewHighlights();
    this.renderView();
  }

  generateViewNotes() {
    return {
      header: {
        text: "Notes",
        count: this.notes.filter(h => !h.deleted).length
      },
      actions: this.generateActions(),
      content: this.notes,
      downloadFileName: "Notes"
    }
  }

  viewNotes() {
    this.view = this.generateViewNotes();
    this.renderView();
  }

  generateViewMarked() {
    return {
      header: {
        text: "Marked",
        count: this.marked.length
      },
      actions: this.generateActions(),
      content: this.marked,
      downloadFileName: "Marked"
    }
  }

  viewMarked() {
    this.view = this.generateViewMarked();
    this.renderView();
  }
  generateViewEdited() {
    return {
      header: {
        text: "Edited",
        count: this.edited.length
      },
      actions: this.generateActions(),
      content: this.edited,
      downloadFileName: "Edited"
    }
  }

  viewEdited() {
    this.view = this.generateViewEdited();
    this.renderView();
  }

  generateViewDuplicates() {
    return {
      header: {
        text: "Duplicates",
        count: this.duplicates.length
      },
      actions: this.generateActions(),
      content: this.duplicates,
      downloadFileName: "Duplicates"
    }
  }

  viewDuplicates() {
    this.view = this.generateViewDuplicates();
    this.renderView();
  }

  generateViewOriginals() {
    return {
      header: {
        text: "Originals",
        count: this.originals.length
      },
      actions: this.generateActions(),
      content: this.originals,
      downloadFileName: "Originals"
    }
  }

  viewOriginals() {
    this.view = this.generateViewOriginals();
    this.renderView();
  }

  // ## VIEW ACTIONS

  generateActions() {
    return [
      {
        text: "Copy",
        callback: () => {
          const output = this.createOutput(this.view.content);
          this.copyToClipboard(output);
          this.flashElement(document.querySelector("#view-content"));
        },
      },
      {
        text: "Download",
        callback: () => {
          const filename = this.addTxtExtension(this.view.downloadFileName);
          const output = this.createOutput(this.view.content);
          this.downloadFile(filename, output);
        },
      }
    ]
  }

  // ### VIEW HEADER

  // ## VIEW CONTENT

  generateClipping(clipping) {
    // Clone template
    const template = document.querySelector("#clipping-template");
    const clone = template.content.cloneNode(true);

    // Populate template with clipping data
    const clippingElement = clone.querySelector(".clipping")
    clippingElement.setAttribute("data-id", clipping.id);

    clone.querySelector(".clipping-metadata").textContent = clipping.metadata;
    clone.querySelector(".clipping-text").textContent = clipping.textEdited || clipping.text;
    clone.querySelector(".separator").textContent = '==========';

    // Add relevant classes
    if (clipping.marked) clippingElement.classList.add("marked");
    if (clipping.original) clippingElement.classList.add("duplicate");
    if (clipping.deleted) clippingElement.classList.add("deleted");

    // Mark as similar TODO: rework
    // if (clipping.similar !== 0) {
    //   clipping.similar.forEach(similar => {
    //     clone.querySelector(".separator").textContent += ` 🚨 (id: ${similar.id})`;
    //   });
    // }

    // TODO: ADD ACTION AND EVENT LISTENERS

    // Mark clipping as active on click
    clone.querySelector(".clipping").addEventListener("click", (event) => {
      const active = document.querySelector(".active-clipping");
      if (active) {
        const id = active.dataset.id
        console.log(id)
        active.classList.remove("active-clipping");
      }
      event.target.closest(".clipping").classList.add("active-clipping");
    })

    // Copy text to clipboard
    clone.querySelector(".clipping-text").addEventListener("mousedown", (event) => {
      this.copyToClipboard(clipping.textEdited || clipping.text);
      this.flashElement(event.currentTarget);
    })

    // Copy metadata + text to clipboard
    clone.querySelector(".clipping-metadata").addEventListener("mousedown", (event) => {
      const text = this.generateFragment(clipping);
      this.copyToClipboard(text);
      this.flashElement(event.currentTarget.parentElement);
    })

    // Copy
    clone.querySelector(".action-copy").addEventListener("click", (event) => {
      const text = this.generateFragment(clipping);
      this.copyToClipboard(text);
      this.flashElement(event.target.closest(".clipping"))
    });

    // Edit
    clone.querySelector(".action-edit").addEventListener("click", (event) => {
      // event.currentTarget.innerText = 'Save';
      const textField = event.currentTarget.closest(".clipping").querySelector(".clipping-text");
      textField.setAttribute("contentEditable", "plaintext-only");
      textField.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault;
          event.stopPropagation;
          console.log(event.currentTarget.textContent)
        }
      });
    });

    // Mark
    clone.querySelector(".action-mark").addEventListener("click", event => {
      if (this.markClipping(clipping)) {
        event.currentTarget.closest(".clipping").classList.add("marked");
      }
    });

    // Unmark
    clone.querySelector(".action-unmark").addEventListener("click", event => {
      if (this.unmarkClipping(clipping)) {
        this.refreshClippingElement(clipping, clippingElement);
        // const newClippingElement = this.generateClipping(clipping);
        // document.querySelector("#view-content").replaceChild(newClippingElement, clippingElement);
        // event.currentTarget.closest(".clipping").classList.remove("marked");
      }
    });

    // Delete
    clone.querySelector(".action-delete").addEventListener("click", event => {
      if (this.deleteClipping(clipping)) {
        event.currentTarget.closest(".clipping").classList.add("deleted");
      }
    });

    // Undelete
    clone.querySelector(".action-undelete").addEventListener("click", event => {
      if (this.undeleteClipping(clipping)) {
        this.refreshClippingElement(clipping, clippingElement);
        // const newClippingElement = this.generateClipping(clipping);
        // const oldClippingElement = event.currentTarget.closest(".clipping");
        // document.querySelector("#view-content").replaceChild(newClippingElement, oldClippingElement);
        // event.currentTarget.closest(".clipping").classList.remove("deleted");
      }
    });
    return clone;
  }

  generateClippings(clippings) {
    const fragment = new DocumentFragment;
    clippings.forEach(clipping => {
      fragment.appendChild(this.generateClipping(clipping));
    });
    return fragment;
  }

  refreshClippingElement(clipping, clippingElement) {
    const newNode = this.generateClipping(clipping);
    newNode.querySelector(".clipping").classList.add("active-clipping");
    clippingElement.parentElement.replaceChild(newNode, clippingElement);
  }

  generateHeaderFromBook(book) {
    return {
      text: `${book.title}, ${book.author}`,
      count: this.countClippings(book.clippings)
    }
  }

  generateHeaderFromSource(source) {
    return {
      text: `Source '${source.filename}'`,
      count: this.countClippings(source.clippings)
    }
  }

  viewBookHeader(book) {
    const header = document.querySelector("#view-header");
    header.innerText = `${book.title} (${book.clippings.length} clipping${book.clippings.length > 1 ? "s" : ""})`;
  }

  viewSourceHeader(source) {
    const header = document.querySelector("#view-header");
    header.innerText = `Source #${source.id} '${source.filename}'`;
  }

  // viewClippingsOfBook(book) {

  //   // Add scan for similar text
  //   const scanTextButton = document.createElement("button");
  //   scanTextButton.innerText = "Scan similar text";
  //   scanTextButton.addEventListener("click", () => {
  //     this.viewDuplicatesOfBook(book);
  //   });
  //   actionsContainer.appendChild(scanTextButton);

  //   // Add scan for similar locations
  //   const scanLocationButton = document.createElement("button");
  //   scanLocationButton.innerText = "Scan similar location";
  //   scanLocationButton.addEventListener("click", () => {
  //     // this.viewDuplicatesOfBook(book);
  //   });
  //   actionsContainer.appendChild(scanLocationButton);

  flashElement(element) {
    element.classList.add("flash");
    setTimeout(() => {
      element.classList.remove("flash");
    }, 250);
  }

  hideMetadata() {
    const clippingElements = document.querySelectorAll(".clipping");
    clippingElements.forEach(element => {
      element.querySelector(".clipping-metadata").style.display = "none";
      element.querySelector("br").style.display = "none";
    });
  }

  // UTILITIES

  copyToClipboard(text) {
    window.navigator.clipboard.writeText(text);
    console.log(text);
    return text
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

  // EXPERIMENTAL

  insertMark(text, start, end) {
    return text.slice(0, start) + "<mark>" + text.slice(start, end) + "</mark>" + text.slice(end)
  }

  initializeKeyboardNavigation() {
    window.addEventListener("keydown", event => {
      if (event.key === "j") {
        this.scrollToNextClipping();
      } else if (event.key === "k") {
        this.scrollToPreviousClipping();
      } else if (event.key === "J") {
        this.scrollToEnd();
      } else if (event.key === "K") {
        this.scrollToTop();
      } else if (event.key === "r") {
        this.scrollToRandomClipping();
      } else if (event.key === "d") {
        this.activeClippingDelete();
      } else if (event.key === "x") {
        this.activeClippingMark();
      } else if (event.key === "e") {
        // TODO
        // this.activeClippingEdit();
      } else if (event.key === "e") {
        // TODO
        // this.activeClippingEdit();
      } else if (event.shiftKey && event.key === "Tab") {
        // TODO
        // this.activeClippingEdit();
      }
    })
  }

  scrollToNextClipping() {
    let active = document.querySelector(".active-clipping");
    if (active && active.nextElementSibling) {
      active.classList.remove("active-clipping");
      active = active.nextElementSibling;
    } else if (!active) {
      active = document.querySelector(".clipping")
    }
    active.classList.add("active-clipping");
    active.scrollIntoView({behavior: "instant", block: "nearest"});
  }

  scrollToPreviousClipping() {
    // Combine with 'next' method with option {}?
    let active = document.querySelector(".active-clipping");
    if (active && active.previousElementSibling) {
      active.classList.remove("active-clipping");
      active = active.previousElementSibling;
    } else if (active && !active.previousElementSibling) {
      active.scrollIntoView({behavior: "instant", block: "end"});
    } else if (!active) {
      const nodes = document.querySelectorAll(".clipping");
      active = nodes[nodes.length - 1];
    }
    active.classList.add("active-clipping");
    active.scrollIntoView({behavior: "instant", block: "nearest"});
  }

  scrollToTop() {
    let active = document.querySelector(".active-clipping");
    if (active) {
      active.classList.remove("active-clipping");
    }
    active = document.querySelector(".clipping")
    active.classList.add("active-clipping");
    active.scrollIntoView({behavior: "instant", block: "end"});
  }

  scrollToEnd() {
    let active = document.querySelector(".active-clipping");
    if (active) {
      active.classList.remove("active-clipping");
    }
    const nodes = document.querySelectorAll(".clipping");
    active = nodes[nodes.length - 1];
    active.classList.add("active-clipping");
    active.scrollIntoView({behavior: "instant", block: "nearest"});
  }


  scrollToRandomClipping() {
    const active = document.querySelector(".active-clipping");
    if (active) {
      active.classList.remove("active-clipping");
    }
    const clippings = document.querySelectorAll(".clipping");
    const random = clippings[Math.floor(Math.random() * clippings.length)];
    random.classList.add("active-clipping");
    random.scrollIntoView({behavior: "instant", block: "center"});
  }

  activeClippingDelete() {
    const active = document.querySelector(".active-clipping");
    if (active) {
      const id = Number.parseInt(active.dataset.id, 10);
      const clipping = this.findClippingById(id);
      if (clipping.deleted) {
        this.undeleteClipping(clipping);
        active.classList.remove("deleted");
      } else {
        this.deleteClipping(clipping);
        active.classList.add("deleted");
        active.classList.remove("marked");
      }
    }
  }

  activeClippingMark() {
    const active = document.querySelector(".active-clipping");
    if (active) {
      const id = Number.parseInt(active.dataset.id, 10);
      const clipping = this.findClippingById(id);
      if (clipping.marked) {
        this.unmarkClipping(clipping);
        active.classList.remove("marked");
      } else {
        this.markClipping(clipping);
        active.classList.add("marked");
      }
    }
  }


  findClippingById(id) {
    return this.clippings.find(clipping => clipping.id === id);
  }

  // TESTING & DEBUGGING

  state() {
    console.log(`*--State--*`
      + `\n${this.sources.length} uploads`
      + `\n${this.clippings.length} clippings (${this.findDeletedClippings(this.clippings).length} deleted, ${this.findEditedClippings(this.clippings).length} edited)`
      + `\n${this.books.length} books`
    )
  }

  findClippingsFromBook(book) {
    return this.clippings.filter(clipping => clipping.title === book.title);
  }

  findEditedClippings(clippings) {
    return clippings.filter(clipping => (clipping.textEdited));

  }
  findDeletedClippings(clippings) {
    return clippings.filter(clipping => (clipping.deleted));
  }

  time(code) {
    const startTime = performance.now();
    eval(code);
    const endTime = performance.now();
    const measure = endTime - startTime
    console.log(`${measure} ms`);
    return measure
  }

  checkNumberClippings(source) {
    const count = source.text.match(/- Your (Highlight|Bookmark|Note) on page/g).length;
    const numClippings = source.clippings.length;
    const check = (count === numClippings);
    if (!check) {
      console.error(`Source '${source.filename}' (id ${source.id}) should have ${count} clippings, has ${numClippings}.`)
    }
    return check
  }

  test() {
    console.log("Running tests")
    // Check sources
    this.sources.forEach(source => {
      this.checkNumberClippings(source);
    });

    // TODO: Write tests to compare number of clippings/books on display with objects in memory
    // TODO: Compare clippings in book.clippings with findClippingsFromBook(book)
    // TODO: same for edited, deleted, marked and similar
    // TODO: Do all books have a title and an author?
    // TODO: Do all clippings have a book?
    // TODO: Test if copy to clipboard produces Kindle format output
    // TODO: Check is number of clippings in this.duplicates is same as number of clippings with duplicate property
    console.log("Tests completed")
  }
}

window.app = new App
