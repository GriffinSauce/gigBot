var async = require("async");
var GoogleSpreadsheet = require("google-spreadsheet");

// spreadsheet key is the long id in the sheets URL
var doc = new GoogleSpreadsheet('1gsjssEUnt5rWr4WtotflDUvi4uhJpi2R6KTNEni0x6U');
var sheet;

async.series([
    function setAuth(step) {
        var creds = require('./google-generated-creds.json');
        doc.useServiceAccountAuth(creds, step);
    },
    function getInfoAndWorksheets(step) {
        doc.getInfo(function(err, info) {
            console.log('Loaded doc: '+info.title+' by '+info.author.email);
            sheet = info.worksheets[0];
            console.log('sheet 1: '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);
            step();
        });
    },
    function workingWithRows(step) {
        // google provides some query options
        sheet.getRows({
            offset: 1,
            limit: 20,
            orderby: 'col2'
        }, function( err, rows ){
            console.log('Read '+rows.length+' rows');
            step();
        });
    },
    function workingWithCells(step) {
        sheet.getCells({
            'min-row': 1,
            'max-row': 5,
            'return-empty': true
        }, function(err, cells) {
            var cell = cells[0];
            console.log('Cell R'+cell.row+'C'+cell.col+' = '+cells.value);

            // cells have a value, numericValue, and formula
            // cell.value == '1'
            // cell.numericValue == 1;
            // cell.formula == '=ROW()';

            step();
        });
    }
    // function managingSheets(step) {
    //   doc.addWorksheet({
    //     title: 'my new sheet'
    //   }, function(err, sheet) {

    //     // change a sheet's title
    //     sheet.setTitle('new title'); //async

    //     //resize a sheet
    //     sheet.resize({rowCount: 50, colCount: 20}); //async

    //     sheet.setHeaderRow(['name', 'age', 'phone']); //async

    //     // removing a worksheet
    //     sheet.del(); //async

    //     step();
    //   });
    // }
]);
