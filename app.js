class App {

  // Initialise instance variables
  uploads = [] // Container for raw strings from uploaded 'my clippings.txt' files
  highlights = [] // Container for bjects representing individual highlights

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
    this.displayUploads();
    this.displayHighlights();
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
      this.displayUploads();
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
      this.displayHighlights();
      this.displayBookList()
      this.printAppState();
    });
  }

  // DISPLAY

  displayUploads() {
    const uploadsContainer = document.querySelector("#preview");

    // Remove previous uploads
    uploadsContainer.innerHTML = "";

    // Insert uploads contained in instance variable as text
    this.uploads.forEach((upload) => {
      uploadsContainer.innerText = upload.text;
    });
  }

  displayHighlights() {
    const template = document.querySelector("#highlight-template");
    const highlightsContainer = document.querySelector("#result");

    // Remove previous highlights
    highlightsContainer.innerHTML = "";

    // Insert highlights contained in instance variable using content template
    this.highlights.forEach((highlight) => {
      const clone = template.content.cloneNode(true);
      clone.querySelector(".highlight").textContent = highlight.text;
      clone.querySelector(".metadata").textContent = `${highlight.title}, ${highlight.author} (page ${highlight.page}, loc ${highlight.locationStart}, on ${highlight.date})`; // TODO: 'page 2, loc 26, 14 August 2022'
      highlightsContainer.appendChild(clone);
    });
  }

  displayBookList() {
    const template = document.querySelector("#booklist-template");
    const booksContainer = document.querySelector("#booklist");

    // TODO: WIP

  }

  // DEBUGGING

  printAppState() {
    console.log(`[State] ${this.uploads.length} uploads, ${this.highlights.length} highlights`)
  }

}

const app = new App
app.connect()
