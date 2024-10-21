const fs = require("fs");
const path = require("path");
const incrementVersion = require("./incrementVersion");

// Function to find the first .pbiviz file in the dist directory
function findPbivizFile() {
  const distDir = path.join(__dirname, "..", "dist");
  const files = fs.readdirSync(distDir);
  return files.find((file) => file.endsWith(".pbiviz"));
}

// Function to rename the file
function renameVisual() {
  const oldFileName = findPbivizFile();

  if (!oldFileName) {
    console.error("No .pbiviz file found in the dist directory.");
    return;
  }

  const distDir = path.join(__dirname, "..", "dist");
  const oldFilePath = path.join(distDir, oldFileName);

  // Increment the version
  const newVersion = incrementVersion();

  // Create new file name with incremented version
  const newFileName = `NHMzh-pbi-viewer-v${newVersion}.pbiviz`;
  const newFilePath = path.join(distDir, newFileName);

  // Rename the file
  fs.renameSync(oldFilePath, newFilePath);

  console.log(`Renamed: ${oldFileName} -> ${newFileName}`);
}

// Execute the renaming
renameVisual();
