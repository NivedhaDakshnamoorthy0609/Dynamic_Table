import { throttle } from './utils.js';

export class GridComponent {
  constructor(fetchCallback, columnConfig) {
    this.fetchDataCallback = fetchCallback;
    this.columns = columnConfig;
    this.headers = columnConfig.map(col => col.dataIndex);
    this.originalData = [];
    this.currentData = [];
    this.currentSort = { column: null, direction: 'asc' };

    this.rowHeight = 50;
    this.viewportHeight = window.innerHeight;
    this.visibleRows = Math.ceil(this.viewportHeight / this.rowHeight);
    this.scrollTop = 0;
    this.scrollOffset = 0;
  }

  async init() {
    await this._fetchData();
    this._setupEventListeners();
  }

  async _fetchData() {
    try {
      const data = await this.fetchDataCallback();
      this.originalData = structuredClone(data);
      this.currentData = structuredClone(data);
      this._resetGrid();
    } catch (err) {
      console.error("Error fetching data", err);
    }
  }

  _setupEventListeners() {
    document.getElementById("filterButton")?.addEventListener("click", () => this._applyFilter());
    document.getElementById("resetButton")?.addEventListener("click", () => this._resetFilter());
    window.addEventListener("scroll", throttle(() => this._onScroll(), 50));
  }

  _resetGrid() {
    this._clearGrid();
    this._renderHeader();
    this._renderonlyVisibleRows();
  }

  _clearGrid() {
    const gridTable = document.querySelector(".grid-table");
    gridTable.innerHTML = '';
    this.scrollTop = 0;
    this.scrollOffset = 0;
  }

  _onScroll() {
    this.scrollTop = window.scrollY;
    this._renderonlyVisibleRows();
  }

  _renderonlyVisibleRows() {
    const startIdx = Math.max(0, Math.floor(this.scrollTop / this.rowHeight) - this.visibleRows);
    const endIdx = Math.min(this.currentData.length, startIdx + this.visibleRows * 3);
    const chunk = this.currentData.slice(startIdx, endIdx);
    this.scrollOffset = startIdx * this.rowHeight;

    document.querySelector(".grid-table").style.transform = `translateY(${this.scrollOffset}px)`;
    this._renderDataChunk(chunk);
  }

  _renderHeader() {
    const gridTable = document.querySelector(".grid-table");
    gridTable.style.gridTemplateColumns = this.columns.map(col => col.width || '1fr').join(' ');

    this.columns.forEach(col => {
      const div = this._createHeaderCell(col);
      gridTable.appendChild(div);
    });
  }

  _createHeaderCell(col) {
    const div = document.createElement("div");
    div.className = "grid-title";

    const label = document.createElement("span");
    label.textContent = col.column;

    const icon = document.createElement("span");
    icon.textContent = this.currentSort.column === col.dataIndex && this.currentSort.direction === 'desc' ? "▼" : "▲";
    icon.style.color = this.currentSort.column === col.dataIndex ? "#000" : "#aaa";
    icon.style.cursor = "pointer";

    div.append(label, icon);

    if (col.sortable) {
      div.addEventListener("click", () => {
        const isSameCol = this.currentSort.column === col.dataIndex;
        this.currentSort.direction = isSameCol && this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        this.currentSort.column = col.dataIndex;

        this._sortData(col.dataIndex);
        this._renderonlyVisibleRows();
        this._updateSortIcons();
      });
    }

    return div;
  }

  _renderDataChunk(chunk) {
    const gridTable = document.querySelector(".grid-table");
    gridTable.querySelectorAll(".grid-item").forEach(row => row.remove());

    if (!chunk.length) {
      const empty = document.createElement("div");
      empty.className = "grid-item";
      empty.style.gridColumn = `span ${this.headers.length}`;
      empty.textContent = "No data found";
      gridTable.appendChild(empty);
      return;
    }

    chunk.forEach(row => {
      this.columns.forEach(col => {
        const div = this._createDataCell(row, col);
        gridTable.appendChild(div);
      });
    });
  }

  _createDataCell(row, col) {
    const div = document.createElement("div");
    div.className = "grid-item";
    const value = row[col.dataIndex];

    if (typeof col.render === "function") {
      div.appendChild(col.render(value, row));
    } else {
      div.textContent = value;
    }

    return div;
  }

  _sortData(column) {
    const { direction } = this.currentSort;

    this.currentData.sort((a, b) => {
      const valA = a[column];
      const valB = b[column];

      if (typeof valA === 'boolean') {
        return direction === 'asc' ? valA - valB : valB - valA;
      }

      const dateA = new Date(valA);
      const dateB = new Date(valB);
      if (!isNaN(dateA) && !isNaN(dateB)) {
        return direction === 'asc' ? dateA - dateB : dateB - dateA;
      }

      if (!isNaN(valA) && !isNaN(valB)) {
        return direction === 'asc' ? valA - valB : valB - valA;
      }

      return direction === 'asc'
        ? valA.toString().localeCompare(valB.toString())
        : valB.toString().localeCompare(valA.toString());
    });
  }

  _updateSortIcons() {
    document.querySelectorAll('.grid-title').forEach(header => {
      const [label, icon] = header.querySelectorAll('span');
      const col = this.columns.find(c => c.column === label.textContent);

      if (col) {
        icon.textContent = (this.currentSort.column === col.dataIndex && this.currentSort.direction === 'desc') ? "▼" : "▲";
        icon.style.color = this.currentSort.column === col.dataIndex ? "#000" : "#aaa";
      }
    });
  }

  _applyFilter() {
    const filters = {};
    this.columns.forEach(col => {
      if (col.filterable) {
        const input = document.getElementById(col.dataIndex);
        if (input) filters[col.dataIndex] = input.value.trim().toLowerCase();
      }
    });

    this.currentData = this.originalData.filter(user => {
      return Object.keys(filters).every(key => {
        const val = user[key]?.toString().toLowerCase() || '';
        return val.startsWith(filters[key]);
      });
    });

    this._clearGrid();
    this._renderHeader();
    this._renderonlyVisibleRows();
    document.activeElement.blur();
  }

  _resetFilter() {
    this.columns.forEach(col => {
      if (col.filterable) {
        const input = document.getElementById(col.dataIndex);
        if (input) input.value = '';
      }
    });

    this.currentSort = { column: null, direction: 'asc' };
    this.currentData = structuredClone(this.originalData);

    this._resetGrid();

    document.querySelectorAll('.grid-title span:nth-child(2)').forEach(icon => {
      icon.textContent = "▲";
      icon.style.color = "#aaa";
    });

    document.activeElement.blur();
  }
}
