

const DB_NAME = 'ExamEaseDB'
const DB_VERSION = 1
const STORE_NAME = 'local_answers'

export const openExamDatabase = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onupgradeneeded = (event) => {
            const database = event.target.result

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, {
                    keyPath: 'id'
                })
            }
        }

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

export const saveAnswer = async (
    attemptId,
    questionId,
    answer,
    sequenceVersion
) => {
    const database = await openExamDatabase()

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(
            STORE_NAME,
            'readwrite'
        )

        const store = transaction.objectStore(STORE_NAME)

        store.put({
            id: `${attemptId}_${questionId}`,
            attemptId,
            questionId,
            answer,
            sequence_version: sequenceVersion,
            is_synced: false,
            updated_at: new Date().toISOString()
        })

        transaction.oncomplete = () => {
            database.close()
            resolve(true)
        }

        transaction.onerror = () => {
            database.close()
            reject(transaction.error)
        }
    })
}

export const getSavedAnswers = async (attemptId) => {
    const database = await openExamDatabase()

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(
            STORE_NAME,
            'readonly'
        )

        const store = transaction.objectStore(STORE_NAME)
        const request = store.getAll()

        request.onsuccess = () => {
            const answers = request.result.filter(
                (item) => item.attemptId === attemptId
            )

            database.close()
            resolve(answers)
        }

        request.onerror = () => {
            database.close()
            reject(request.error)
        }
    })
}
