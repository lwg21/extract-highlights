class App {

  // Initialise instance variables
  sources = [] // Container for raw strings from uploaded 'my clippings.txt' files
  highlights = [] // Container for objects representing individual highlights
  books = [] // Container for distinct books
  highlightId = 0;

  // Run upon load the of DOM, initialises event listeners
  connect() {
    // Confirms whether app.js is connected
    document.addEventListener("DOMContentLoaded", () => {
      console.log("app.js connected")
    });

    // Drag-and-drop area
    const dropArea = document.querySelector("#drop-area")
    dropArea.addEventListener("dragenter", (event) => {
      dropArea.style.backgroundColor = "lightgreen";
    });

    dropArea.addEventListener("dragleave", (event) => {
      dropArea.style.backgroundColor = "lightgrey";
    });

    dropArea.addEventListener('dragover', (event) => {
      event.stopPropagation();
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    });

    dropArea.addEventListener("drop", (event) => {
      event.stopPropagation();
      event.preventDefault();
      dropArea.style.backgroundColor = "lightgrey";
      const files = event.dataTransfer.files;
      for (let i = 0; i < files.length; i++) {
        let file = files.item(i)
        console.log(file);
        console.log(file.name)
        this.readFile(file);
      }
    });

    // Reset button
    const resetButton = document.querySelector("#reset");
    resetButton.addEventListener("click", () => {
      this.reset();
    });

    // View source button
    const viewSourceButton = document.querySelector("#view-source");
    viewSourceButton.addEventListener("click", () => {
      this.viewSource();
    });

    // View highlights button
    const viewHighlightsButton = document.querySelector("#view-highlights");
    viewHighlightsButton.addEventListener("click", () => {
      this.viewHighlights();
    });
  }

  reset() {
    this.sources = [];
    this.highlights = [];
    this.books = [];
    this.viewBooks();
    // this.viewSource();
    this.viewHighlights();
    this.printAppState();
  }

  readFile(file) {
    const reader = new FileReader();
    reader.addEventListener("load", (event) => {
      const upload = {
        filename: file.name,
        text: event.target.result
      };
      this.sources.push(upload)
      this.viewSource();
      console.log(`File '${upload.filename}' imported`);
      this.extractData();
    });
    reader.readAsText(file);
  }

  extractData() {
    this.extractHighlights(); // TODO: Remove for production
    this.extractBooks();
    this.viewBooks()
    this.printAppState();
  }

  extractHighlights() {
    this.sources.forEach((upload) => {
      const clippings = upload.text.split(/\s*==========\s*/);
      console.log(`${clippings.length} clippings in uploads`)
      clippings.forEach((clipping) => {
        if (!clipping) return null
        const regex = /(?<title>[\S ]+) (?:- (?<authorAlt>[\w ]+)|\((?<author>[^(]+)\))\s*- Your (?<type>\w+) on page (?<pageStart>\d*)-?(?<pageEnd>\d*)(?: \| location (?<locationStart>\d+)-?(?<locationEnd>\d*))? \| Added on (?<date>[\S ]*)\s*(?<text>.*)\s*/
        const highlight = clipping.match(regex).groups
        // highlight.original = clipping
        highlight.original = clipping;
        highlight.metadata = clipping.split(/(\r?\n)/).slice(0,3).join('');
        highlight.id = this.assignHighlightId();
        this.highlights.push(highlight);
      });
    });
  }

  extractBooks() {
    this.books = [...new Set(this.highlights.map((highlight) => highlight.title))].sort()
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
  }

  assignHighlightId() {
    this.highlightId += 1;
    return this.highlightId;
  }

  // VIEW

  viewSource() {
    const viewContainer = document.querySelector("#view-content");

    // Clear view
    viewContainer.innerHTML = "";

    // Insert uploads contained in instance variable as text
    viewContainer.innerText += this.sources[0].text;

    // Update title with number of files
    const numberUploads = this.sources.length;
    document.querySelector("#view-title").innerText = `Source (${numberUploads} file${numberUploads > 1 ? 's' : ''})`;
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
        window.navigator.clipboard.writeText(this.highlights.find(highlight => highlight.id === Number.parseInt(id, 10)).text);
      });

      clone.querySelector(".action-edit").addEventListener("click", (event) => {
        event.target.innerText = 'Save';
        event.target.parentElement.querySelector(".highlight-text").setAttribute("contentEditable", "true");
      });

      // Insert highlight into DOM
      viewContainer.appendChild(clone);
    });

    // Update title with number of highlights
    this.viewTitle(`${highlights.length} highlight${highlights.length > 1 ? 's' : ''}`);
  }

  viewTitle(title, description = '') {
    document.querySelector("#view-title").innerText = `${title}${description ? ` (${description})` : ''}`;
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

    // Insert list of books
    this.books.forEach((book) => {
      const bookItem = document.createElement("li");
      bookItem.textContent = book;

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
    const highlights = this.highlights.filter(highlight => highlight.title === book);
    this.viewHighlights(highlights);
  }

  // UTILITIES

  printAppState() {
    console.log(`[State] ${this.sources.length} uploads, ${this.highlights.length} highlights`)
  }
}

const app = new App
app.connect()
