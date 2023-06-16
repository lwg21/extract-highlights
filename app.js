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

    // Extract highlights button
    const extractButton = document.querySelector("#extract");
    extractButton.addEventListener("click", () => {
      this.extractHighlights()
    });
  }

  readFile(file) {
    const reader = new FileReader();
    reader.addEventListener("load", (event) => {
      const result = event.target.result;
      const upload = {
        name: file.name,
        text: result
      };
      this.updateUploads(upload);
      this.extractHighlights(); // TODO: Remove for production
    });
    reader.readAsText(file);
  }

  updateUploads(upload) {
    this.uploads.push(upload)
    document.querySelector("#preview").innerText += upload.text;
    console.log(`File '${upload.name}' imported. ${this.uploads.length} uploads in memory`);
  }

  extractHighlights() {
    this.uploads.forEach((upload) => {
      const clippings = upload.text.trim().split(/\s*==========\s*/);
      console.log(`${clippings.length} clippings in uploads`)
      clippings.forEach((clipping) => {
        if (!clipping) return null
        const regex = /(?<title>[\S ]+) (?:- (?<author_alt>[\w ]+)|\((?<author>[^(]+)\))\s*- Your (?<type>\w+) on page (?<page>\d*)-?(?:\d*)(?: \| location (?<location_start>\d+)-?(?<location_end>\d*))? \| Added on (?<date>[\S ]*)\s*(?<text>.*)\s*/
        const highlight = clipping.match(regex).groups
        highlight.original = clipping
        this.highlights.push(highlight);
      });
      console.log(`${this.highlights.length} highlights in memory`)
    });
  }
}

const app = new App
app.connect()
