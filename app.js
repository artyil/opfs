const worker = new Worker('./workerOpfs.js');

const nameEl = document.getElementsByName('fileName')[0];
const inputEl = document.getElementsByName('fileInput')[0];

inputEl.addEventListener('change', async function (value) {
	const file = this.files[0];

	// save file with OPFS
	worker.postMessage({ method: 'saveFile', file, fileName: nameEl.value });

	setTimeout(listFiles, 1000);
});

const buttonEl = document.getElementById('readFile');
buttonEl.addEventListener('click', async function (value) {
	// read file with OPFS
	worker.postMessage({ method: 'readFile', fileName: nameEl.value });
});

worker.onmessage = function (event) {
	console.log(event);
	console.log(JSON.stringify(event.data, null, 2));
	const { file } = event.data.result || {};
	const fileInfo = {
		name: file?.name,
		size: file?.size,
		type: file?.type,
		lastModified: file?.lastModified,
	};
	document.getElementById('fileData').innerHTML = JSON.stringify(fileInfo, null, 2);
};

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
			return `<li style="margin:10px 0"><button onclick="readFileButtonClick('${name}')"><b>${name}</b> ${file.size}<button></li>`;
		}),
		'</ul>',
	].join('\n');
}

window.readFileButtonClick = function (fileName) {
	worker.postMessage({ method: 'readFile', fileName });
};

listFiles();
