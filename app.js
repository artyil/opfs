const worker = new Worker('./workerOpfs.js');

const nameEl = document.getElementsByName('fileName')[0];
const inputEl = document.getElementsByName('fileInput')[0];
const readFileDataButton = document.getElementById('readFile');

inputEl.addEventListener('change', async function () {
	for (const file of this.files) {
		// save file with OPFS
		worker.postMessage({ method: 'saveFile', file, fileName: nameEl.value });
	}
	this.value = [];
});

readFileDataButton.addEventListener('click', async function (e) {
	e.preventDefault();
	window.readFileButtonClick(nameEl.value?.trim());
});

const numberFormatter = new Intl.NumberFormat('en-US');

async function downloadFile(file) {
	const blobUrl = URL.createObjectURL(file);
	const a = document.createElement('a');
	a.href = blobUrl;
	a.download = file.name;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();

	URL.revokeObjectURL(blobUrl);
	document.body.removeChild(a);
}

async function listFiles() {
	const rootDirHandle = await navigator.storage.getDirectory();
	const entries = await rootDirHandle.entries();
	const files = [];
	for await (const [name, fileHandle] of entries) {
		const file = await fileHandle.getFile();
		files.push([name, file]);
	}

	document.querySelector('#files').innerHTML = [
		'<ul>',
		...files.map(([name, file]) => {
			const size = numberFormatter.format(file.size);
			return `<li>
        <button onclick="readFileButtonClick('${name}')">
          <b>${name}</b>
          <span class=size>${size}</span>
        </button>
      </li>`;
		}),
		'</ul>',
	].join('\n');
}

window.readFileButtonClick = function (fileName) {
	worker.postMessage({ method: 'readFile', fileName });
	worker.postMessage({ method: 'readFileWithAccessHandle', fileName });
};

const asyncWorkerHandlers = new Map();
function downloadOpfsFile(fileName, method) {
	const messageId = Date.now() + '' + Math.random();

	asyncWorkerHandlers.set(messageId, (workerEvent) => {
		asyncWorkerHandlers.delete(messageId);
		const { result: { file } = {} } = workerEvent.data || {};
		downloadFile(file);
	});

	worker.postMessage({ method, fileName, messageId });
}

worker.onmessage = function (event) {
	if (event.data.messageId) {
		asyncWorkerHandlers.get(event.data.messageId)?.(event);
		return;
	}

	if (event.data.updateList === true) {
		listFiles();
	}

	console.log('onmessage event recieved from worker', event, JSON.stringify(Object.keys(event.data?.result?.file), null, 2));

	const { method = '', result: { file } = {} } = event.data || {};
	const fileInfo = {
		name: file?.name,
		size: file?.size,
		type: file?.type,
		lastModified: file?.lastModified,
	};

	if (method === 'readFileWithAccessHandle' || method === 'saveFile') {
		document.getElementById('fileDataAccessHandle').innerHTML = JSON.stringify(fileInfo, null, 2);
		document.getElementById('fileDataAccessHandleDownload').onclick = () =>
			downloadOpfsFile(fileInfo.name, 'readFileWithAccessHandle');
	}
	if (method === 'readFile' || method === 'saveFile') {
		document.getElementById('fileData').innerHTML = JSON.stringify(fileInfo, null, 2);
		document.getElementById('fileDataDownload').onclick = () => downloadOpfsFile(fileInfo.name, 'readFile');
	}
};

addEventListener('DOMContentLoaded', () => {
	listFiles();
});
