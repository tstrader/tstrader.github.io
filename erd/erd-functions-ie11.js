"use strict";

/*
This needs to be run through babel at https://babeljs.io/en/repl.htm before being copied to erd-functions-ie11.js

*/

var layoutColumnWidth = 350;
var primaryTable;
var maxFromLevels = 1;
var maxToLevels = 1;
var filteredTableFields = [];

function csvJSON_old(csv) {
	var lines = csv.split("\n");
	var result = [];
	var headers = lines[0].split(",");
	for (var i = 1; i < lines.length; i++) {
		var obj = {};
		var currentline = lines[i].split(",");

		for (var j = 0; j < headers.length; j++) {
			obj[headers[j]] = currentline[j];
		}
		result.push(obj);
	}
	return result; //JavaScript object
	//return JSON.stringify(result); //JSON
}

function csvJSON(text) {
	var p = '',
	    row = [''],
	    ret = [row],
	    i = 0,
	    r = 0,
	    s = !0,
	    l = void 0;
	var _iteratorNormalCompletion = true;
	var _didIteratorError = false;
	var _iteratorError = undefined;

	try {
		for (var _iterator = text[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
			l = _step.value;

			if ('"' === l) {
				if (s && l === p) row[i] += l;
				s = !s;
			} else if (',' === l && s) l = row[++i] = '';else if ('\n' === l && s) {
				if ('\r' === p) row[i] = row[i].slice(0, -1);
				row = ret[++r] = [l = ''];i = 0;
			} else row[i] += l;
			p = l;
		}
	} catch (err) {
		_didIteratorError = true;
		_iteratorError = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion && _iterator.return) {
				_iterator.return();
			}
		} finally {
			if (_didIteratorError) {
				throw _iteratorError;
			}
		}
	}

	return ret;
};

function processCSVData(csvData, asOfDate, callback) {

	var tablesFields = {};
	var connections = [];
	var allTables = [];
	var allDates = [];
	var filteredConnections = [];

	var json = Papa.parse(csvData, {
		header: true
	});
	tablesFields = json['data'];
	//console.log(tablesFields);
	//tablesFields = csvJSON(csvData);


	tablesFields.forEach(function (field) {
		//console.log('!' + field['release_date']);
		if (asOfDate == '' || field['release_date'] == 'prod' || field['release_date'] <= asOfDate && field['release_date'] != '' && field['release_date'] != 'prod' && asOfDate != 'prod') {
			if (field['mapped_from_table'] != "" && field['mapping_type'] != 'recursive') {
				connections.push({
					"from_table": field['mapped_from_table'],
					"to_table": field['table_name'],
					"from_field": field['mapped_from_field'],
					"to_field": field['field_name']
				});
			}
			if (allTables.indexOf(field['table_name']) == -1) {
				allTables.push(field['table_name']);
			}
			filteredTableFields.push(field);
		}
		if (allDates.indexOf(field['release_date']) == -1 && field['release_date'] != '') {
			allDates.push(field['release_date']);
		}
	});

	connections.forEach(function (connection) {
		if (allTables.indexOf(connection['from_table']) >= 0 && allTables.indexOf(connection['to_table']) >= 0) {
			filteredConnections.push(connection);
		}
	});

	connections = filteredConnections;
	tablesFields = filteredTableFields;
	allDates = allDates.sort(function (a, b) {
		return new Date(b.date) - new Date(a.date);
	});
	var data = {
		"connections": connections,
		"allTables": allTables,
		"allDates": allDates,
		"filteredTableFields": filteredTableFields,
		"tablesFields": tablesFields
	};

	callback(data);
}

function getData(callback) {
	//$.when( $.ajax( "table_fields.csv" ), $.ajax( "connections.csv" ) ).done(function( d0, d1 ) {
	//    const tablesFieldsCSV = d0[0];
	//    const connectionsCSV = d1[0];
	$.when($.ajax('table_fields.csv')).done(function (d0) {
		callback(d0);
	});
}

function getTableName(data, tableName) {
	for (var i = 0; i < data['tablesFields'].length; i++) {
		if (data['tablesFields'][i]['table_name'].toLowerCase() == tableName.toLowerCase()) {
			//console.log(data['tablesFields'][i]['table_name']);
			return data['tablesFields'][i]['table_name'];
		}
	}
	return 0;
}

/*
primaryTable = params['primaryTable'] ||  'contentUsageHistory';
maxFromLevels = params['maxFromLevels'] ||  1;
maxToLevels = params['maxToLevels'] ||  1;
includeAllFields = params['includeAllFields']=='true' ||  false;
showAllTables = params['showAllTables']=='true' ||  false;
asOfDate = params['asOfDate'] ||  '';
 */

function buildAllTables(elem, data) {
	data['allTables'].forEach(function (table) {
		addTable(table, [], 0, true);
	});
	$(elem + ' .tables').css('width', 'calc(100vw - 40px)');
	$(elem + ' .tables').css('height', 'auto');
	$(elem + ' .tables').addClass('masonry');
	var $grid = $(elem + ' .masonry').masonry({
		itemSelector: '.db-table'
	});

	createAllConnections();

	$grid.on('layoutComplete', function (event, laidOutItems) {
		createAllConnections();
	});
}
function buildTree(elem, data, primaryTable, maxFromLevels, maxToLevels) {
	//console.log('buildTree');
	addTable(elem, data, primaryTable, [], 0, true);

	// Create the from tables
	iterateTableTree(elem, data, primaryTable, -1, maxFromLevels);
	// Create the to tables
	iterateTableTree(elem, data, primaryTable, 1, maxToLevels);

	// Center all the tables
	alignTables(elem, maxFromLevels, maxToLevels);

	// Add the from connections
	iterateConnectionTree(elem, data, primaryTable, -1, maxFromLevels);
	// Add the to connections
	iterateConnectionTree(elem, data, primaryTable, 1, maxToLevels);
	$(window).on('resize', function (e) {
		adjustZoom(elem);
	});
	$(elem + ' .table-name').click(function () {
		//console.log('setting hash to ' + "#reporting-" + $(this).text().toLowerCase() + "get");
		window.location.hash = "#reporting-" + $(this).text().toLowerCase() + "get";
	});

	/*
 $(elem + ' .field').on('mouseenter', function () {
 console.log($(this).data('description'));
     var description = $(this).data('description');
     if(description != '' && description != undefined){
         $('.erd-tooltip').html($(this).data('description'));
         //console.log('top: ' + $(this).offset().top);
         $('.erd-tooltip').css('top', $(this).offset().top);
         $('.erd-tooltip').css('left', $(this).offset().left + $(this).outerWidth() + 5);
         $('.erd-tooltip').show();            
     }
     
 });
 $(elem + ' .field').on('mouseout', function () {
 $('.erd-tooltip').hide();
 });
 */
}

function createAllConnections(elem, data) {
	$(elem + ' .connections').empty();
	data['connections'].forEach(function (connection) {
		//console.log('adding connection');
		var fromFieldSelector = '[data-table-name=' + connection['from_table'] + '] [data-field-name=' + connection['from_field'] + ']';
		//console.log(fromFieldSelector);
		var fromField = $(fromFieldSelector);
		//console.log(fromField.offset());

		var toFieldSelector = '[data-table-name=' + connection['to_table'] + '] [data-field-name=' + connection['to_field'] + ']';
		//console.log(toFieldSelector);
		var toField = $(toFieldSelector);
		//console.log(toField.offset());

		if (fromField.length > 0 && toField.length > 0) {
			//console.log('adding path');
			// M x1,y1 Cx,y x,y x2,y2
			// M x1,y1 C((x1+x2)/2),y1 ((x1+x2)/2),y2 x2,y2
			if (fromField.offset().left < toField.offset().left) {
				var x1 = fromField.offset().left + fromField.outerWidth() - $(elem + ' .connections').offset().left;
				var x2 = toField.offset().left - $(elem + ' .connections').offset().left;
			} else {
				var x1 = fromField.offset().left - $(elem + ' .connections').offset().left;
				var x2 = toField.offset().left + toField.outerWidth() - $('.connections').offset().left;
			}
			var y1 = fromField.offset().top + fromField.outerHeight() / 2 - $(elem + ' .connections').offset().top;
			var y2 = toField.offset().top + fromField.outerHeight() / 2 - $(elem + ' .connections').offset().top;

			var path = "M " + x1 + "," + y1 + " C" + (x1 + x2) / 2 + "," + y1 + " " + (x1 + x2) / 2 + "," + y2 + " " + x2 + "," + y2;
			$(elem + ' .connections').append("\n                        <svg class=\"drawing-area connectors\">\n                            <path class=\"fk-connector\" d=\"" + path + "\" />\n                        </svg>\n                    ");
		}
	});
}

function addTable(elem, data, tableName, tableList, level, includeAllFields) {
	// Create the primary table
	//console.log('adding table ' + tableName);
	var tableRows = [];
	if (includeAllFields) {
		data['tablesFields'].forEach(function (field) {
			if (field['table_name'] == tableName) {
				//console.log(field['field_name']);
				if (field['description'] != '' && field['description'] != undefined) {
					var tableRow = "<tr><td class=\"field\" tooltip=\"" + field['description'] + "\" data-field-name=\"" + field['field_name'] + "\">" + field['field_name'] + "</td></tr>            ";
				} else {
					var tableRow = "<tr><td class=\"field\" data-field-name=\"" + field['field_name'] + "\">" + field['field_name'] + "</td></tr>            ";
				}
				tableRows.push(tableRow);
			}
		});
	} else if (level < 0) {
		data['connections'].forEach(function (connection) {
			if (connection['from_table'] == tableName && tableList.indexOf(connection['to_table']) > -1) {
				var tableRow = "<tr><td class=\"field\"  data-field-name=\"" + connection['from_field'] + "\">" + connection['from_field'] + "</td></tr>            ";
				tableRows.push(tableRow);
			}
			if (level * -1 < maxFromLevels) {
				if (connection['to_table'] == tableName) {
					var _tableRow = "<tr><td class=\"field\" data-field-name=\"" + connection['to_field'] + "\">" + connection['to_field'] + "</td></tr>            ";
					tableRows.push(_tableRow);
				}
			}
		});
	} else if (level > 0) {
		data['connections'].forEach(function (connection) {
			if (connection['to_table'] == tableName && tableList.indexOf(connection['from_table']) > -1) {
				var tableRow = "<tr><td class=\"field\" data-field-name=\"" + connection['to_field'] + "\">" + connection['to_field'] + "</td></tr>            ";
				tableRows.push(tableRow);
			}
			if (level < maxToLevels) {
				if (connection['from_table'] == tableName) {
					var _tableRow2 = "<tr><td class=\"field\" data-field-name=\"" + connection['from_field'] + "\">" + connection['from_field'] + "</td></tr>            ";
					tableRows.push(_tableRow2);
				}
			}
		});
	}
	var uniqueTableRows = [];
	tableRows.forEach(function (row) {
		if (uniqueTableRows.indexOf(row) == -1) {
			uniqueTableRows.push(row);
		}
	});

	var table = "\n                <table class=\"db-table\" data-layout-column=" + level + " data-table-name=\"" + tableName + "\" style='top: 0px; left: " + (level * layoutColumnWidth + maxFromLevels * layoutColumnWidth) + "px;'>\n                    <tr><td class=\"table-name\">" + tableName + "</td></tr>\n                    " + uniqueTableRows.join('') + "\n                </table>            \n            ";
	$(elem + ' .tables').append(table);
}
function iterateTableTree(elem, data, primaryTable, direction, maxLevels) {
	//console.log('iterateTableTree');
	if (direction == -1) {
		var current = 'to_table';
		var next = 'from_table';
		var current_field = 'to_field';
		var next_field = 'from_field';
	} else {
		var current = 'from_table';
		var next = 'to_table';
		var current_field = 'from_field';
		var next_field = 'to_field';
	}
	var tableList = [primaryTable];
	//console.log(tableList);


	var nextTableList = [];
	for (var i = 0; i < maxLevels; i++) {
		//console.log('running table level ' + (i+1) * direction);

		var reorderedConnections = [];

		tableList.forEach(function (table) {
			data['tablesFields'].forEach(function (row) {
				if (row['table_name'] == table) {
					data['connections'].forEach(function (connection) {
						if (connection[current] == table && connection[current_field] == row['field_name']) {
							//console.log('adding connection ' );
							//console.log(connection);
							reorderedConnections.push(connection);
						}
					});
				}
			});
		});

		//console.log('reorderedConnections');
		//console.log(reorderedConnections);
		nextTableList = [];
		reorderedConnections.forEach(function (connection) {
			//console.log('checking ' );
			//console.log(connection);
			if (tableList.indexOf(connection[current]) > -1 && nextTableList.indexOf(connection[next]) == -1) {
				addTable(elem, data, connection[next], tableList, (i + 1) * direction, false);
				nextTableList.push(connection[next]);
			}
		});

		var top = 0;
		var tables = $(elem + ' [data-layout-column=' + (i + 1) * direction + ']');

		for (var ti = 0; ti < tables.length; ti++) {
			var table = tables[ti];
			//console.log('top');
			$(table).css('top', top);
			//console.log($(table).offset().top);
			top = $(table).offset().top + $(table).outerHeight() + 20 - $(elem + ' .connections').offset().top;
			//console.log('new top ' + top);
		}
		tableList = nextTableList;
	}
}

function iterateConnectionTree(elem, data, primaryTable, direction, maxLevels) {
	//console.log('iterating connections for ' + primaryTable);
	if (direction == -1) {
		var current = 'to_table';
		var next = 'from_table';
		var current_field = 'to_field';
		var next_field = 'from_field';
	} else {
		var current = 'from_table';
		var next = 'to_table';
		var current_field = 'from_field';
		var next_field = 'to_field';
	}
	var tableList = [primaryTable];
	//console.log(tableList);
	var nextTableList = [];
	for (var i = 0; i < maxLevels; i++) {
		//console.log('running level ' + (i+1));
		nextTableList = [];
		data['connections'].forEach(function (connection) {
			//console.log('Adding connection from ' + connection[next] + '.' + connection[next_field] + ' to ' + connection[current] + '.' + connection[current_field]);
			var fromFieldSelector = elem + ' [data-table-name=' + connection[next] + '][data-layout-column=' + (i + 1) * direction + '] [data-field-name=' + connection[next_field] + ']';
			//console.log(fromFieldSelector);
			var fromField = $(fromFieldSelector);
			//console.log(fromField.offset());

			var toFieldSelector = elem + ' [data-table-name=' + connection[current] + '][data-layout-column=' + ((i + 1) * direction + -1 * direction) + '] [data-field-name=' + connection[current_field] + ']';
			//console.log(toFieldSelector);
			var toField = $(toFieldSelector);
			//console.log(toField.offset());

			if (fromField.length > 0 && toField.length > 0) {
				//console.log('adding path');
				// M x1,y1 Cx,y x,y x2,y2
				// M x1,y1 C((x1+x2)/2),y1 ((x1+x2)/2),y2 x2,y2
				if (direction == -1) {
					var x1 = fromField.offset().left + fromField.outerWidth() - $(elem + ' .connections').offset().left;
					var y1 = fromField.offset().top + fromField.outerHeight() / 2 - $(elem + ' .connections').offset().top;
					var x2 = toField.offset().left - $(elem + ' .connections').offset().left;
					var y2 = toField.offset().top + fromField.outerHeight() / 2 - $(elem + ' .connections').offset().top;
				} else {
					var x1 = fromField.offset().left - $(elem + ' .connections').offset().left;
					var y1 = fromField.offset().top + fromField.outerHeight() / 2 - $(elem + ' .connections').offset().top;
					var x2 = toField.offset().left + toField.outerWidth() - $(elem + ' .connections').offset().left;
					var y2 = toField.offset().top + fromField.outerHeight() / 2 - $(elem + ' .connections').offset().top;
				}
				//console.log(`adding path (${x1},${y1}) to (${x2},${y2})`);
				var path = "M " + x1 + "," + y1 + " C" + (x1 + x2) / 2 + "," + y1 + " " + (x1 + x2) / 2 + "," + y2 + " " + x2 + "," + y2;
				$(elem + ' .connections').append("\n                            <svg class=\"drawing-area connectors\">\n                                <path class=\"fk-connector\" d=\"" + path + "\" />\n                            </svg>\n                        ");
			}
		});

		tableList = nextTableList;
	}
}

function alignTables(elem, maxFromLevels, maxToLevels) {
	var minColumn = maxFromLevels * -1;
	var maxColumn = maxToLevels;
	var top = 0;
	var bottom = 0;
	var colHeights = [];
	var offsetColumns = 0;
	var i;
	var maxHeight = 0;

	for (i = minColumn; i < 0; i++) {
		if ($(elem + ' [data-layout-column=' + i + ']').length == 0) {
			minColumn++;
		}
	}
	for (i = maxColumn; i > 0; i--) {
		if ($(elem + ' [data-layout-column=' + i + ']').length == 0) {
			maxColumn--;
		}
	}
	if (minColumn == 0 && maxColumn == 1) {
		offsetColumns = -0.5;
		minColumn = -1;
	}
	if (minColumn == -1 && maxColumn == 0) {
		offsetColumns = 0.5;
		maxColumn = 1;
	}
	//console.log('min: ' + minColumn + ' max: ' + maxColumn);
	for (i = 0; i <= maxColumn - minColumn; i++) {
		maxHeight = 0;
		$(elem + ' [data-layout-column=' + (i + minColumn) + ']').each(function () {
			//console.log('top: ' + $(this).offset().top + ' height: ' + $(this).outerHeight() + ' offset: ' + $(elem + ' .tables').offset().top + ' maxheight: ' + maxHeight);
			maxHeight = Math.max($(this).offset().top + $(this).outerHeight() - $(elem + ' .tables').offset().top, maxHeight);
			$(this).css('left', (i + offsetColumns) * layoutColumnWidth);
		});
		colHeights.push(maxHeight);
	}
	maxHeight = Math.max.apply(Math, colHeights);
	var midHeight = maxHeight / 2;
	for (i = 0; i <= maxColumn - minColumn; i++) {
		var adjust = midHeight - colHeights[i] / 2;
		$(elem + ' [data-layout-column=' + (i + minColumn) + ']').each(function () {
			$(this).css('top', $(this).offset().top + adjust - $(elem + ' .connections').offset().top);
		});
	}
	$(elem + ' .drawing-area').css('height', maxHeight);
	$(elem + ' .drawing-area').css('width', (maxColumn - minColumn) * 350 + 300);
	$(elem + ' .drawing-area').attr('data-natural-width', (maxColumn - minColumn) * 350 + 300);

	//console.log('elem (' + elem + ') width: ' + $(elem).width());
	//console.log('natural width: ' + $(elem + ' .drawing-area').attr('data-natural-width'));
	adjustZoom(elem);
}

function adjustZoom(elem) {
	var zoomPercent = Math.min(100, 100 * $(elem).width() / $(elem + ' .drawing-area').attr('data-natural-width'));
	$(elem + ' .inner-container').css('zoom', zoomPercent + '%');

	//console.log('Setting zoom to ' + zoomPercent);
	$(elem + ' .inner-container').css('height', $(elem + ' .drawing-area').height());
}