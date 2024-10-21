# NHMzh-pbi-viewer

PowerBI visual for viewing IFC models using @thatopen/components.

> **Note:** This viewer is in development - it currently needs a local server to load the IFC models.

## Project setup

This project is set up using the powerbi-visuals-webpack-plugin. It allows us to use strict ecmaScript modules like @thatopen/components.

The initial setup of this project is done using the powerbi-visuals-tools.
https://learn.microsoft.com/en-gb/power-bi/developer/visuals/develop-circle-card

Then webpack is added to the project to allow us to use the powerbi-visuals-webpack-plugin.
https://github.com/microsoft/powerbi-visuals-webpack-plugin

To enable loading of the IFC models, we need to allow the visual to access the server where the models are hosted. This is done by adding the server url to the capabilities.json file.

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

> enable developer settings (follow the develop-circle-card guide)

1. Run `npm install` to install the dependencies.
2. Run `npm run dev` to start the development server.

When encountering a 'Can't connect to the server' error in PowerBI, open this link in your browser and allow access:
https://localhost:8080/assets/

## Building the project

Run `npm run build` to build the project.

## debugging

In `webpack.config.js` the following is needed to enable `debugger;` statements to actually break in the browser.

```
devtool: "eval-source-map",
```

When debugging VisualUpdateTypes, this table might be useful:

| VisualUpdateType             | Decimal | Binary    |
| ---------------------------- | ------- | --------- |
| Data                         | 2       | 000000010 |
| Resize                       | 4       | 000000100 |
| ViewMode                     | 8       | 000001000 |
| Style                        | 16      | 000010000 |
| ResizeEnd                    | 32      | 000100000 |
| FormattingSubSelectionChange | 64      | 001000000 |
| FormatModeChange             | 128     | 010000000 |
| FilterOptionsChange          | 256     | 100000000 |
| All                          | 510     | 111111110 |

## Notes

- In PowerBI, There is a difference between selection and filtering. Think about how a slicer works vs what happens when you select something in a table visual.
  - Filtering restricts the data that is displayed. This is usually a bit more permanent.
  - Selection should usually be more temporary. It will nevertheless usually affect all visuals on the dashboard.
  - HOWEVER: This viewer currently handles selection and filtering the same way.
    It will isolate the viewport according to all incoming filters or selections. This means that if you select something in another visual, it will isolate the viewport according to that as well.
  - This might need to be changed in the future.
    - Selections made in powerbi would select objects in the viewer.
    - Filters made in powerbi would filter the data in the viewer.
    - Selections made in the viewer already work as expected. They set the PowerBI selection state, not the filtering state.
