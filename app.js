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
      separator: "\r\n==========\r\n"
    };
  }

  initializeData() {
    this.sources = [] // Contains objects representing raw source strings from 'my clippings.txt' files
    this.highlights = [] // Contains objects representing individual highlights
    this.books = [] // Contains objects representing distinct books
    this.sourceId = 0;
    this.highlightId = 0;
    this.bookId = 0;
    this.viewSources();
    this.viewBooks();
    this.viewHighlights();
    this.state();
  }

  initializeUI() {
    // Initialize main actions
    document.querySelector("#reset").addEventListener("click", () => this.initializeData());
    document.querySelector("#view-source").addEventListener("click", () => this.viewSource());
    document.querySelector("#view-highlights").addEventListener("click", () => this.viewHighlights());

    // Initialize drag-and-drop area
    const dropArea = document.querySelector("#menu")
    dropArea.addEventListener("dragenter", (event) => {
      dropArea.style.backgroundColor = "#D2FF96";
    });

    dropArea.addEventListener("dragleave", (event) => {
      dropArea.style.backgroundColor = null;
    });

    dropArea.addEventListener('dragover', (event) => {
      event.stopPropagation();
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      dropArea.style.backgroundColor = "#D2FF96";

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
      this.viewSource();
      this.extractData();
    });
    reader.readAsText(file);
  }

  extractData() {
    // Analyse sources to populate highlights and books, update view
    this.extractHighlights();
    // this.extractBooks();
    this.viewBooks()
    this.state();
  }

  extractHighlights() {
    this.sources.forEach((source) => {
      const clippings = source.text.split(/\s*==========\s*/);
      clippings.forEach((clipping) => {
        if (!clipping) return null

        // Parse clipping, create highlight object and add it to highlights
        const regex = /(?<title>[\S ]+) (?:- (?<authorAlt>[\w ]+)|\((?<author>[^(]+)\))\s*- Your (?<type>\w+) on page (?<pageStart>\d*)-?(?<pageEnd>\d*)(?: \| location (?<locationStart>\d+)-?(?<locationEnd>\d*))? \| Added on (?<date>[\S ]*)\s*(?<text>.*)\s*/
        const highlight = clipping.match(regex).groups
        highlight.original = clipping;
        highlight.metadata = clipping.split(/(\r?\n)/).slice(0,3).join('');
        highlight.id = this.assignHighlightId();
        this.highlights.push(highlight);

        // Find existing book or create new book
        const book = this.findBookbyTitle(highlight.title) || this.createBook(highlight.title);

        // Link highlight and book both ways
        highlight.book = book;
        book.highlights.push(highlight);
      });
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

  findBook(id) {
    return this.books.find(book => book.id === Number.parseInt(id, 10));
  }

  findBookbyTitle(title) {
    return this.books.find(book => book.title === title);
  }

  copyToClipboard(text) {
    window.navigator.clipboard.writeText(text);
    console.log(`Copied to clipboard:\n${text}`);
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

  findHighlight(id) {
    return this.highlights.find(highlight => highlight.id === Number.parseInt(id, 10));
  }

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

  // VIEW

  viewSource() {
    const viewContainer = document.querySelector("#view-content");

    // Clear view
    viewContainer.innerHTML = "";

    // Insert uploads contained in instance variable as text
    viewContainer.innerText += this.sources[0].text;

    // Update title with number of files
    const numberSources = this.sources.length;
    this.viewSourceHeader("Source", `${numberSources} file${numberSources > 1 ? 's' : ''}`)
    // document.querySelector("#view-header").innerText = `Source (${numberUploads} file${numberUploads > 1 ? 's' : ''})`;
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

      // Set event listeners to highlight actions
      clone.querySelector(".action-copy").addEventListener("click", (event) => {
        const id = event.target.closest(".highlight").dataset.id;
        const highlight = this.findHighlight(id);
        this.copyToClipboard(highlight.text);
      });

      clone.querySelector(".action-edit").addEventListener("click", (event) => {
        event.target.innerText = 'Save';
        event.target.parentElement.querySelector(".highlight-text").setAttribute("contentEditable", "true");
      });

      clone.querySelector(".action-delete").addEventListener("click", (event) => {
        const id = event.target.closest(".highlight").dataset.id;
        const highlight = this.findHighlight(id);
        this.deleteHighlight(highlight);
        if (highlight.deleted) {
          const id = event.target.closest(".highlight").remove();
        }
      });

      // Insert highlight into DOM
      viewContainer.appendChild(clone);
    });
  }

  viewBookHeader(book = undefined) {
    const header = document.querySelector("#view-header");
    header.innerText = `${book.title} (${book.highlights.length} highlight${book.highlights.length > 1 ? "s" : ""})`;
  }

  viewSourceHeader() {
    // TODO
  }

  viewSources() {
    const template = document.querySelector("#sourcelist-template");
    const sourcesContainer = document.querySelector("#sourcelist");

    // Remove previous sources
    sourcesContainer.innerHTML = "";

    // Insert total number of sources
    const clone = template.content.cloneNode(true);
    const sourcesTitle = clone.querySelector("#sourcelist-title");
    sourcesTitle.innerText = `All sources (${this.sources.length})`;
    sourcesContainer.appendChild(sourcesTitle);

    // Get and sort books
    const books = this.books.sort((a, b) => {
      return a.title.localeCompare(b.title);
    });

    // Insert list of books
    books.forEach((book) => {
      const bookItem = document.createElement("li");
      bookItem.setAttribute("data-id", book.id);
      bookItem.textContent = book.title + ` (${book.highlights.length})`;

      // Active book has different list item style
      bookItem.addEventListener("click", (event) => {
        this.viewHighlightsOfBook(book);
        const bookItems = Array.from(event.target.parentElement.children);
        bookItems.forEach(item => item.classList.remove("book-open"));
        event.target.classList.add("book-open");
      });

      booksContainer.appendChild(bookItem);
    });
  }

  viewBooks() {
    const template = document.querySelector("#booklist-template");
    const booksContainer = document.querySelector("#booklist");

    // Remove previous books
    booksContainer.innerHTML = "";

    // Insert total number of books
    const clone = template.content.cloneNode(true);
    const booksTitle = clone.querySelector("#booklist-title");
    booksTitle.innerText = `All books (${this.books.length})`;
    booksContainer.appendChild(booksTitle);

    // Get and sort books
    const books = this.books.sort((a, b) => {
      return a.title.localeCompare(b.title);
    });

    // Insert list of books
    books.forEach((book) => {
      const bookItem = document.createElement("li");
      bookItem.setAttribute("data-id", book.id);
      bookItem.textContent = book.title + ` (${book.highlights.length})`;

      // Active book has different list item style
      bookItem.addEventListener("click", (event) => {
        this.viewHighlightsOfBook(book);
        const bookItems = Array.from(event.target.parentElement.children);
        bookItems.forEach(item => item.classList.remove("book-open"));
        event.target.classList.add("book-open");
      });

      booksContainer.appendChild(bookItem);
    });
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
    copyButton.addEventListener("click", () => {
      const output = this.generateOutput(book);
      this.copyToClipboard(output);
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
  }

  // UTILITIES & CHECKS

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
}

const app = new App
