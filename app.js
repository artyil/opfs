const worker = new Worker('./workerOpfs.js');

const nameEl = document.getElementsByName('fileName')[0];
const inputEl = document.getElementsByName('fileInput')[0];

inputEl.addEventListener('change', async function (value) {
	for (const file of this.files) {
		// save file with OPFS
		worker.postMessage({ method: 'saveFile', file, fileName: nameEl.value });
	}
});

const buttonEl = document.getElementById('readFile');
buttonEl.addEventListener('click', async function (e) {
	e.preventDefault();
	// read file with OPFS
	worker.postMessage({ method: 'readFile', fileName: nameEl.value });
});

worker.onmessage = function (event) {
	if (event.data.updateList === true) {
		listFiles();
	}

	console.log(event);
	console.log(JSON.stringify(Object.keys(event.data?.result?.file), null, 2));

	const { file } = event.data.result || {};
	const fileInfo = {
		name: file?.name,
		size: file?.size,
		type: file?.type,
		lastModified: file?.lastModified,
	};
	document.getElementById('fileData').innerHTML = JSON.stringify(fileInfo, null, 2);
};

const numberFormatter = new Intl.NumberFormat('en-US');

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
			return `<li><button onclick="readFileButtonClick('${name}')"><b>${name}</b> <span class=size>${size}</span></button></li>`;
		}),
		'</ul>',
	].join('\n');
}

window.readFileButtonClick = function (fileName) {
	worker.postMessage({ method: 'readFile', fileName });
};

listFiles();
