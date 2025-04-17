import { columnConfig } from './config.js';
import { GridComponent } from './grid-component.js';

const fetchUsers = async () => {
  const response = await fetch("http://localhost:3000/users");
  const data = await response.json();
  return data;
};

const grid = new GridComponent(fetchUsers, columnConfig);
grid.init();
