const fs = require("fs");
const path = require("path");

function incrementVersion() {
  const packagePath = path.join(__dirname, "..", "package.json");
  const package = JSON.parse(fs.readFileSync(packagePath, "utf8"));

  const [major, minor, patch] = package.version.split(".").map(Number);
  package.version = `${major}.${minor}.${patch + 1}`;

  fs.writeFileSync(packagePath, JSON.stringify(package, null, 2));
  console.log(`Version incremented to ${package.version}`);
  return package.version;
}

module.exports = incrementVersion;
