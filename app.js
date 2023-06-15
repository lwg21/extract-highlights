class App {

  uploads = []
  highlights = []

  connect() {
    // Check if app.js is connected upon HTML load
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
    });
    reader.readAsText(file);
  }

  updateUploads(upload) {
    this.uploads.push(upload)
    document.querySelector("#preview").innerText += upload.text;
    console.log(`File '${upload.name}' imported. ${this.uploads.length} uploads in memory`);
  }

  extractHighlights() {
    // TODO: WIP
    const text = this.uploads[0].text;
    console.log(text);
    const highlights = text.trim().split(/==========/);
    highlights.forEach((highlight) => {
      this.createHighlight(highlight);
    });
  }

  createHighlight(text) {
    // TODO: WIP
    console.log("creating highlight")
    if (!text) return null
    const lines = text.trim().split(/\r?\n/)
    console.log(lines)
    const regexTitleAuthor = /(?<title>[\S ]+) (?:- (?<author_alt>[\w ]+)|\((?<author>[^(]+)\))/
    // this.highlights.push(lines[0].match(regexTitleAuthor));
    console.log(lines[0].match(regexTitleAuthor).groups);
    const regexMetadata = /Your (?<type>\w+) on page (?<page>\d*)-?(?:\d*)(?: \| location (?<location_start>\d+)-?(?<location_end>\d*))? \| Added on (?<date>[\S ]*)/
    console.log(lines[1].match(regexMetadata).groups);
  }
}

const app = new App
app.connect()
