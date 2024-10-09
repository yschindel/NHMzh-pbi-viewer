# NHMzh-pbi-viewer

PowerBI visual for viewing IFC models using @thatopen/components.

## Project setup

This project is set up using the powerbi-visuals-webpack-plugin. It allows us to use strict ecmaScript modules like @thatopen/components.

The initial setup of this project is done using the powerbi-visuals-tools.
https://learn.microsoft.com/en-gb/power-bi/developer/visuals/develop-circle-card

Then webpack is added to the project to allow us to use the powerbi-visuals-webpack-plugin.
https://github.com/microsoft/powerbi-visuals-webpack-plugin

To enable loading of the IFC models, we need to allow the visual to access the server. This is done by adding the server url to the capabilities.json file.

```
{
  "dataViewMappings": [],
  "privileges": [
    {
      "name": "WebAccess",
      "essential": true,
      "parameters": ["http://localhost:3000"]
    }
  ]
}
```

## Running the project

> > use powerbi.com for development
> > enable developer settings (follow the develop-circle-card guide)

1. Run `npm install` to install the dependencies.
2. Run `npm run dev` to start the development server.

When encountering a 'Can't connect to the server' error in PowerBI, open this link in your browser and allow access:
https://localhost:8080/assets/

## debugging

In `webpack.config.js` the following is needed to enable `debugger;` statements to actually break in the browser.

```
devtool: "eval-source-map",
```
