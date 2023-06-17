class App {

  // Initialise instance variables
  uploads = [] // Container for raw strings from uploaded 'my clippings.txt' files
  highlights = [] // Container for objects representing individual highlights
  books = [] // Container for distinct books
  // selectedBooks = []

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

    // Extract highlights button
    const extractButton = document.querySelector("#extract");
    extractButton.addEventListener("click", () => {
      this.extractHighlights()
    });
  }

  reset() {
    this.uploads = [];
    this.highlights = [];
    this.books = [];
    this.displaySource();
    this.displayHighlights();
    this.displayModified();
    this.displayBooks();
    this.printAppState();
  }

  readFile(file) {
    const reader = new FileReader();
    reader.addEventListener("load", (event) => {
      const upload = {
        filename: file.name,
        text: event.target.result
      };
      this.uploads.push(upload)
      this.displaySource();
      console.log(`File '${upload.filename}' imported`);
      this.extractHighlights(); // TODO: Remove for production
    });
    reader.readAsText(file);
  }

  extractHighlights() {
    this.uploads.forEach((upload) => {
      const clippings = upload.text.trim().split(/\s*==========\s*/);
      console.log(`${clippings.length} clippings in uploads`)
      clippings.forEach((clipping) => {
        if (!clipping) return null
        const regex = /(?<title>[\S ]+) (?:- (?<authorAlt>[\w ]+)|\((?<author>[^(]+)\))\s*- Your (?<type>\w+) on page (?<page>\d*)-?(?:\d*)(?: \| location (?<locationStart>\d+)-?(?<locationEnd>\d*))? \| Added on (?<date>[\S ]*)\s*(?<text>.*)\s*/
        const highlight = clipping.match(regex).groups
        highlight.original = clipping
        this.highlights.push(highlight);
      });
      this.extractBooks();
      this.displayHighlights();
      this.displayModified();
      this.displayBooks()
      this.printAppState();
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

  // DISPLAY

  displaySource() {
    const sourceContainer = document.querySelector("#source-content");

    // Remove previous uploads
    sourceContainer.innerHTML = "";

    // Insert uploads contained in instance variable as text
    // this.uploads.forEach((upload) => {
    //   sourceContainer.innerText += upload.text;
    // });
    sourceContainer.innerText += this.uploads[0].text;

    // Update title with number of files
    const numberUploads = this.uploads.length;
    document.querySelector("#source-title").innerText = `Source (${numberUploads} file${numberUploads > 1 ? 's' : ''})`;
  }

  displayHighlights() {
    const template = document.querySelector("#highlight-template");
    const highlightsContainer = document.querySelector("#highlights-imported-content");

    // Remove previous highlights
    highlightsContainer.innerHTML = "";

    // Insert highlights contained in instance variable using content template
    this.highlights.slice(0,200).forEach((highlight) => {
      const clone = template.content.cloneNode(true);
      clone.querySelector(".highlight").textContent = highlight.original;
      clone.querySelector(".separator").textContent = '==========';
      highlightsContainer.appendChild(clone);
    });
  }

  displayModified() {
    const template = document.querySelector("#highlight-template");
    const highlightsContainer = document.querySelector("#highlights-modified-content");

    // Remove previous highlights
    highlightsContainer.innerHTML = "";

    // Insert highlights contained in instance variable using content template
    this.highlights.slice(0,200).forEach((highlight) => {
      const clone = template.content.cloneNode(true);
      clone.querySelector(".highlight").textContent = `${highlight.text}\n\n${highlight.title}, ${highlight.author || highlight.authorAlt} (page ${highlight.page}, loc ${highlight.locationStart}, on ${highlight.date})`; // TODO: 'page 2, loc 26, 14 August 2022'
      clone.querySelector(".separator").textContent = '==========';
      highlightsContainer.appendChild(clone);
    });
  }

  displayBooks() {
    const template = document.querySelector("#booklist-template");
    const booksContainer = document.querySelector("#booklist");

    // Remove previous books
    booksContainer.innerHTML = "";

    // Insert total number of books
    const allBooksSummary = document.createElement("h3");
    allBooksSummary.innerText = `All books (${this.books.length})`;
    booksContainer.appendChild(allBooksSummary);
    console.log(allBooksSummary);

    // Insert list of books
    this.books.forEach((book) => {
      const clone = template.content.cloneNode(true);
      clone.querySelector("li").textContent = book;
      booksContainer.appendChild(clone);
    });
  }

  // DEBUGGING

  printAppState() {
    console.log(`[State] ${this.uploads.length} uploads, ${this.highlights.length} highlights`)
  }
}

const app = new App
app.connect()
