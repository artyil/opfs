/** @param {File} fileToClone  */
async function saveFile(fileToClone, fileName) {
	fileName = fileName || fileToClone.name;

	const rootDirHandle = await navigator.storage.getDirectory();
	const fileHandle = await rootDirHandle.getFileHandle(fileName, { create: true });

	const buffer = new DataView(await fileToClone.arrayBuffer());

	const accessHandle = await fileHandle.createSyncAccessHandle();
	await accessHandle.write(buffer, { at: 0 });
	await accessHandle.truncate(buffer.byteLength);
	await accessHandle.flush();
	await accessHandle.close();

	const newFileHandle = await rootDirHandle?.getFileHandle(fileName);
	const clonedFile = await newFileHandle.getFile();

	return {
		file: clonedFile,
	};
}

/** @param {string} fileName  */
async function readFile(fileName) {
	const rootDirHandle = await navigator.storage.getDirectory();
	const fileHandle = await rootDirHandle.getFileHandle(fileName);

	const accessHandle = await fileHandle.createSyncAccessHandle();

	const fileSize = await accessHandle.getSize();
	const readBuffer = new DataView(new ArrayBuffer(fileSize));
	const readSize = await accessHandle.read(readBuffer, { at: 0 });
	await accessHandle.close();

	const existingFile = new File([readBuffer], fileHandle.name /* { type: fileHandle.type } */);

	console.log('readFile results', existingFile.size);

	return {
		file: existingFile,
	};
}

/** @param {{data:{file:File;fileName:string;method:string;messageId:string}}} event  */
onmessage = async function (event) {
	console.log('🧵 OPFS Worker: message recieved in worker', event.data);

	const { file, fileName, method, messageId } = event.data;

	switch (method) {
		case 'saveFile': {
			if (!file) throw new TypeError('file required');
			const result = await saveFile(file, fileName);

			console.log('🧵 OPFS Worker: Posting message back to main script');
			postMessage({ result, messageId });
			break;
		}

		case 'readFile': {
			if (!fileName) throw new TypeError('fileName required');
			const readResult = await readFile(fileName, 'message');
			const result = {
				file: readResult.file,
			};
			console.log('🧵 OPFS Worker: Posting message back to main script');
			postMessage({ result, messageId });
			break;
		}

		default: {
			throw new TypeError(`🧵 OPFS Worker: Invalid method ${event.data.method}`);
		}
	}
};
