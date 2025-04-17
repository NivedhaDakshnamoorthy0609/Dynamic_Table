import { throttle } from './utils.js';

export class GridComponent {
  constructor(fetchCallback, columnConfig) {
    this.fetchDataCallback = fetchCallback;
    this.columns = columnConfig;
    this.headers = columnConfig.map(col => col.dataIndex);
    this.allData = [];
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
    await this.fetchData();
    this.setupEventListeners();
  }

  async fetchData() {
    try {
      const data = await this.fetchDataCallback();

      this.originalData = JSON.parse(JSON.stringify(data));
      this.allData = data;
      this.currentData = [...data];
      this.clearGrid();
      this.renderHeaderOnce();
      this.renderVisibleRows();
    } catch (err) {
      console.error("Error fetching data", err);
    }
  }

  setupEventListeners() {
    document.getElementById("filterButton").addEventListener("click", () => this.applyFilter());
    document.getElementById("resetButton").addEventListener("click", () => this.resetFilter());
    window.addEventListener("scroll", throttle(() => {
      this.checkScrollAndLoad();
    }, 50));
  }

  clearGrid() {
    const gridTable = document.querySelector(".grid-table");
    gridTable.innerHTML = '';
    this.scrollTop = 0;
    this.scrollOffset = 0;
  }

  sortData(column) {
    const direction = this.currentSort.direction;
    if (column === 'isLoggedIn' || column === 'isWfHToday') {
      this.currentData.sort((a, b) => {
        let valA = a[column] ?? false;
        let valB = b[column] ?? false;
        return direction === 'asc' ? (valA === valB ? 0 : valA ? 1 : -1) : (valA === valB ? 0 : valA ? -1 : 1);
      });
    } else {
      this.currentData.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        const dateA = new Date(valA);
        const dateB = new Date(valB);
        const isDate = !isNaN(dateA) && !isNaN(dateB);
        if (typeof valA === 'boolean') {
          return direction === 'asc' ? (valA === valB ? 0 : valA ? 1 : -1) : (valA === valB ? 0 : valA ? -1 : 1);
        }
        if (isDate) return direction === 'asc' ? dateA - dateB : dateB - dateA;
        if (!isNaN(valA) && !isNaN(valB)) return direction === 'asc' ? valA - valB : valB - valA;
        return direction === 'asc' ? valA.toString().localeCompare(valB.toString()) : valB.toString().localeCompare(valA.toString());
      });
    }
  }

  checkScrollAndLoad() {
    this.scrollTop = window.scrollY;
    this.renderVisibleRows();
  }

  renderVisibleRows() {
    const gridTable = document.querySelector(".grid-table");

    const startIdx = Math.max(0, Math.floor(this.scrollTop / this.rowHeight) - this.visibleRows);
    const endIdx = Math.min(this.currentData.length, startIdx + this.visibleRows * 3);
    const chunk = this.currentData.slice(startIdx, endIdx);
    this.scrollOffset = startIdx * this.rowHeight;

    this.displayVisibleData(chunk);
    gridTable.style.transform = `translateY(${this.scrollOffset}px)`;
  }

  renderHeaderOnce() {
    const gridTable = document.querySelector(".grid-table");

    const columnWidths = this.columns.map(col => col.width || '1fr').join(' ');
    gridTable.style.gridTemplateColumns = columnWidths;

    this.columns.forEach(col => {
      const header = col.column;
      const dataIndex = col.dataIndex;

      const div = document.createElement("div");
      div.className = "grid-title";

      const label = document.createElement("span");
      label.textContent = header;

      const icon = document.createElement("span");
      icon.textContent = (this.currentSort.column === dataIndex && this.currentSort.direction === 'desc') ? "▼" : "▲";
      icon.style.color = this.currentSort.column === dataIndex ? "#000" : "#aaa";
      icon.style.cursor = "pointer";

      div.appendChild(label);
      div.appendChild(icon);

      if (col.sortable) {
        div.addEventListener("click", () => {
          this.currentSort.direction = (this.currentSort.column === dataIndex && this.currentSort.direction === 'asc') ? 'desc' : 'asc';
          this.currentSort.column = dataIndex;
          this.sortData(dataIndex);
          this.renderVisibleRows();
          this.updateSortIcons();
        });
      }

      gridTable.appendChild(div);
    });
  }

  updateSortIcons() {
    const headers = document.querySelectorAll('.grid-title');
    headers.forEach(header => {
      const spans = header.querySelectorAll('span');
      const label = spans[0];
      const icon = spans[1];
      const dataIndex = this.columns.find(col => col.column === label.textContent)?.dataIndex;
      if (dataIndex) {
        icon.textContent = (this.currentSort.column === dataIndex && this.currentSort.direction === 'desc') ? "▼" : "▲";
        icon.style.color = this.currentSort.column === dataIndex ? "#000" : "#aaa";
      }
    });
  }

  displayVisibleData(chunk) {
    const gridTable = document.querySelector(".grid-table");
    const rows = gridTable.querySelectorAll(".grid-item");
    rows.forEach(row => row.remove());

    if (!chunk.length) {
      const div = document.createElement("div");
      div.className = "grid-item";
      div.style.gridColumn = `span ${this.headers.length}`;
      div.textContent = "No data found";
      gridTable.appendChild(div);
      return;
    }

    chunk.forEach(row => {
      this.columns.forEach(col => {
        const key = col.dataIndex;
        const div = document.createElement("div");
        div.className = "grid-item";

        if (typeof col.render === "function") {
          const customContent = col.render(row[key], row);
          div.appendChild(customContent);
        } else {
          div.textContent = row[key];
        }

        gridTable.appendChild(div);
      });
    });
  }

  applyFilter() {
    const filters = {};
    this.columns.forEach(col => {
      if (col.filterable) {
        const input = document.getElementById(col.dataIndex);
        if (input) filters[col.dataIndex] = input.value.trim().toLowerCase();
      }
    });

    const filtered = this.allData.filter(user => {
      return Object.keys(filters).every(key => {
        const userValue = user[key]?.toString().toLowerCase();
        const filterValue = filters[key];
        return userValue?.startsWith(filterValue);
      });
    });

    this.currentData = filtered;
    this.clearGrid();
    this.renderHeaderOnce();
    if (filtered.length > 0) {
      this.renderVisibleRows();
    } else {
      this.displayVisibleData([]);
    }
    document.activeElement.blur();
  }

  resetFilter() {
    this.columns.forEach(col => {
      if (col.filterable) {
        const input = document.getElementById(col.dataIndex);
        if (input) input.value = "";
      }
    });

    this.currentSort = { column: null, direction: 'asc' };
    this.currentData = JSON.parse(JSON.stringify(this.originalData));
    this.clearGrid();
    this.renderHeaderOnce();
    this.renderVisibleRows();

    const headers = document.querySelectorAll('.grid-title');
    headers.forEach(header => {
      const spans = header.querySelectorAll('span');
      if (spans.length > 1) {
        const icon = spans[1];
        icon.textContent = "▲";
        icon.style.color = "#aaa";
      }
    });

    document.activeElement.blur();
  }
}