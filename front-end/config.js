export const columnConfig = [
    { column: "Name", dataIndex: "name", sortable: true, filterable: true,width: "1fr" },
    { column: "Age", dataIndex: "age", sortable: true, filterable: true,width: "1fr",
        render: (value) => {
            const color = value < 30 ? "green" : value <= 50 ? "orange" : "red";
            const wrapper = document.createElement("div");
      
            const dot = document.createElement("span");
            dot.className = "age-dot";
            dot.style.backgroundColor = color;
      
            const text = document.createElement("span");
            text.className = "age-text";
            text.textContent = value;
      
            wrapper.appendChild(dot);
            wrapper.appendChild(text);
            return wrapper;
          }

    },
    { column: "Address", dataIndex: "address", sortable: true, filterable: true,width: "1fr" },
    { column: "Is Logged In", dataIndex: "isLoggedIn", sortable: true, filterable: false,width: "1fr",
        render: (value) => {
            const status = value ? "Yes" : "No";
            const wrapper = document.createElement("div");
            wrapper.className = "status-wrapper";
            wrapper.textContent = status;
            return wrapper;
        }
      },
      { column: "Is WFH Today", dataIndex: "isWfHToday", sortable: true, filterable: false,width: "1fr",
        render: (value) => {
            const status = value ? "Yes" : "No";
            const wrapper = document.createElement("div");
            wrapper.className = "status-wrapper";
            wrapper.textContent = status;
            return wrapper;
        }
      },
      

     

]