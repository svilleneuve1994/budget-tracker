let db;

const request = indexedDB.open('budgetDB', 1);

request.onupgradeneeded = function (event) {
  const { oldVersion } = event;
  const newVersion = event.newVersion || db.version;

  console.log(`DB Updated from version ${oldVersion} to ${newVersion}`);

  db = event.target.result;

  if (db.objectStoreNames.length === 0) {
    db.createObjectStore('pending', { autoIncrement: true });
  }
};

request.onerror = function (event) {
  console.log(`Woops! ${event.target.errorCode}`);
};

function checkDatabase() {
  console.log('Checking db...');

  // Open a transaction on your pending db
  let transaction = db.transaction(['pending'], 'readwrite'); // here

  // access your pending object
  const store = transaction.objectStore('pending');

  // Get all records from store and set to a variable
  const getAll = store.getAll();

  // If the request was successful
  getAll.onsuccess = function () {
    // If there are items in the store, we need to bulk add them when we are back online
    if (getAll.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((res) => {
          // If our returned response is not empty
          if (res.length !== 0) {
            // Open another transaction to pending with the ability to read and write
            transaction = db.transaction(['pending'], 'readwrite');

            // Assign the current store to a variable
            const currentStore = transaction.objectStore('pending');

            // Clear existing entries because our bulk add was successful
            currentStore.clear();
            console.log('Cleaning up 🧹');
          }
        });
    }
  };
}

request.onsuccess = function (event) {
  console.log('Success!');
  db = event.target.result;

  if (navigator.onLine) {
    console.log('Backend online! 🗄️');
    checkDatabase();
  }
};

const saveRecord = (record) => {
  console.log('Save record invoked');
  // Create a transaction on the pending db with readwrite access
  const transaction = db.transaction(['pending'], 'readwrite');

  // Access your pending object store
  const store = transaction.objectStore('pending');

  // Add record to your store with add method.
  store.add(record);
};

// Listen for app coming back online
window.addEventListener('online', checkDatabase);
