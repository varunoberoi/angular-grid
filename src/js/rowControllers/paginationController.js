var template = require('./paginationPanel.html');
var utils = require('./../utils');

function PaginationController() {}

PaginationController.prototype.init = function(angularGrid, gridOptionsWrapper) {
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.angularGrid = angularGrid;
    this.setupComponents();
    this.callVersion = 0;
};

PaginationController.prototype.setDatasource = function(datasource) {
    this.datasource = datasource;

    if (!datasource) {
        // only continue if we have a valid datasource to work with
        return;
    }

    this.reset();
};

PaginationController.prototype.reset = function() {
    // copy pageSize, to guard against it changing the the datasource between calls
    if (this.datasource.pageSize && typeof this.datasource.pageSize !== 'number') {
        console.warn('datasource.pageSize should be a number');
    }
    this.pageSize = this.datasource.pageSize;
    // see if we know the total number of pages, or if it's 'to be decided'
    if (typeof this.datasource.rowCount === 'number' && this.datasource.rowCount >= 0) {
        this.rowCount = this.datasource.rowCount;
        this.foundMaxRow = true;
        this.calculateTotalPages();
    } else {
        this.rowCount = 0;
        this.foundMaxRow = false;
        this.totalPages = null;
    }

    this.currentPage = 0;

    // hide the summary panel until something is loaded
    this.ePageRowSummaryPanel.style.visibility = 'hidden';

    this.setTotalLabels();
    this.loadPage();
};

PaginationController.prototype.setTotalLabels = function() {
    if (this.foundMaxRow) {
        this.lbTotal.innerHTML = this.totalPages.toLocaleString();
        this.lbRecordCount.innerHTML = this.rowCount.toLocaleString();
    } else {
        var moreText = this.gridOptionsWrapper.getLocaleTextFunc()('more', 'more');
        this.lbTotal.innerHTML = moreText;
        this.lbRecordCount.innerHTML = moreText;
    }
};

PaginationController.prototype.calculateTotalPages = function() {
    this.totalPages = Math.floor((this.rowCount - 1) / this.pageSize) + 1;
};

PaginationController.prototype.pageLoaded = function(rows, lastRowIndex) {
    var firstId = this.currentPage * this.pageSize;
    this.angularGrid.setRows(rows, firstId);
    // see if we hit the last row
    if (!this.foundMaxRow && typeof lastRowIndex === 'number' && lastRowIndex >= 0) {
        this.foundMaxRow = true;
        this.rowCount = lastRowIndex;
        this.calculateTotalPages();
        this.setTotalLabels();

        // if overshot pages, go back
        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages - 1;
            this.loadPage();
        }
    }
    this.enableOrDisableButtons();
    this.updateRowLabels();
};

PaginationController.prototype.updateRowLabels = function() {
    var startRow;
    var endRow;
    if (this.isZeroPagesToDisplay()) {
        startRow = 0;
        endRow = 0;
    } else {
        startRow = (this.pageSize * this.currentPage) + 1;
        endRow = startRow + this.pageSize - 1;
        if (this.foundMaxRow && endRow > this.rowCount) {
            endRow = this.rowCount;
        }
    }
    this.lbFirstRowOnPage.innerHTML = (startRow).toLocaleString();
    this.lbLastRowOnPage.innerHTML = (endRow).toLocaleString();

    // show the summary panel, when first shown, this is blank
    this.ePageRowSummaryPanel.style.visibility = null;
};

PaginationController.prototype.loadPage = function() {
    this.enableOrDisableButtons();
    var startRow = this.currentPage * this.datasource.pageSize;
    var endRow = (this.currentPage + 1) * this.datasource.pageSize;

    this.lbCurrent.innerHTML = (this.currentPage + 1).toLocaleString();

    this.callVersion++;
    var callVersionCopy = this.callVersion;
    var that = this;
    this.angularGrid.showLoadingPanel(true);

    var sortModel;
    if (this.gridOptionsWrapper.isEnableServerSideSorting()) {
        sortModel = this.angularGrid.getSortModel();
    }

    var filterModel;
    if (this.gridOptionsWrapper.isEnableServerSideFilter()) {
        filterModel = this.angularGrid.getFilterModel();
    }

    var params = {
        startRow: startRow,
        endRow: endRow,
        successCallback: successCallback,
        failCallback: failCallback,
        sortModel: sortModel,
        filterModel: filterModel
    };

    // check if old version of datasource used
    var getRowsParams = utils.getFunctionParameters(this.datasource.getRows);
    if (getRowsParams.length > 1) {
        console.warn('ag-grid: It looks like your paging datasource is of the old type, taking more than one parameter.');
        console.warn('ag-grid: From ag-grid 1.9.0, now the getRows takes one parameter. See the documentation for details.');
    }

    this.datasource.getRows(params);

    function successCallback(rows, lastRowIndex) {
        if (that.isCallDaemon(callVersionCopy)) {
            return;
        }
        that.pageLoaded(rows, lastRowIndex);
    }

    function failCallback() {
        if (that.isCallDaemon(callVersionCopy)) {
            return;
        }
        // set in an empty set of rows, this will at
        // least get rid of the loading panel, and
        // stop blocking things
        that.angularGrid.setRows([]);
    }
};

PaginationController.prototype.isCallDaemon = function(versionCopy) {
    return versionCopy !== this.callVersion;
};

PaginationController.prototype.onBtNext = function() {
    this.currentPage++;
    this.loadPage();
};

PaginationController.prototype.onBtPrevious = function() {
    this.currentPage--;
    this.loadPage();
};

PaginationController.prototype.onBtFirst = function() {
    this.currentPage = 0;
    this.loadPage();
};

PaginationController.prototype.onBtLast = function() {
    this.currentPage = this.totalPages - 1;
    this.loadPage();
};

PaginationController.prototype.isZeroPagesToDisplay = function() {
    return this.foundMaxRow && this.totalPages === 0;
};

PaginationController.prototype.enableOrDisableButtons = function() {
    var disablePreviousAndFirst = this.currentPage === 0;
    this.btPrevious.disabled = disablePreviousAndFirst;
    this.btFirst.disabled = disablePreviousAndFirst;

    var zeroPagesToDisplay = this.isZeroPagesToDisplay();
    var onLastPage = this.foundMaxRow && this.currentPage === (this.totalPages - 1);

    var disableNext = onLastPage || zeroPagesToDisplay;
    this.btNext.disabled = disableNext;

    var disableLast = !this.foundMaxRow || zeroPagesToDisplay || this.currentPage === (this.totalPages - 1);
    this.btLast.disabled = disableLast;
};

PaginationController.prototype.createTemplate = function() {
    var localeTextFunc = this.gridOptionsWrapper.getLocaleTextFunc();
    return template
        .replace('[PAGE]', localeTextFunc('page', 'Page'))
        .replace('[TO]', localeTextFunc('to', 'to'))
        .replace('[OF]', localeTextFunc('of', 'of'))
        .replace('[OF]', localeTextFunc('of', 'of'))
        .replace('[FIRST]', localeTextFunc('first', 'First'))
        .replace('[PREVIOUS]', localeTextFunc('previous', 'Previous'))
        .replace('[NEXT]', localeTextFunc('next', 'Next'))
        .replace('[LAST]', localeTextFunc('last', 'Last'));
};

PaginationController.prototype.getGui= function() {
    return this.eGui;
};

PaginationController.prototype.setupComponents = function() {

    this.eGui = utils.loadTemplate(this.createTemplate());

    this.btNext = this.eGui.querySelector('#btNext');
    this.btPrevious = this.eGui.querySelector('#btPrevious');
    this.btFirst = this.eGui.querySelector('#btFirst');
    this.btLast = this.eGui.querySelector('#btLast');
    this.lbCurrent = this.eGui.querySelector('#current');
    this.lbTotal = this.eGui.querySelector('#total');

    this.lbRecordCount = this.eGui.querySelector('#recordCount');
    this.lbFirstRowOnPage = this.eGui.querySelector('#firstRowOnPage');
    this.lbLastRowOnPage = this.eGui.querySelector('#lastRowOnPage');
    this.ePageRowSummaryPanel = this.eGui.querySelector('#pageRowSummaryPanel');

    var that = this;

    this.btNext.addEventListener('click', function() {
        that.onBtNext();
    });

    this.btPrevious.addEventListener('click', function() {
        that.onBtPrevious();
    });

    this.btFirst.addEventListener('click', function() {
        that.onBtFirst();
    });

    this.btLast.addEventListener('click', function() {
        that.onBtLast();
    });
};

module.exports = PaginationController;
