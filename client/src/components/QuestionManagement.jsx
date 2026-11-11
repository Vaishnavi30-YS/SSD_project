
import { useEffect, useState } from 'react'
import './QuestionManagement.css'

const API_URL = 'http://localhost:5000/api/v1/exams'

function QuestionManagement({ examinations = [] }) {
    const [selectedExam, setSelectedExam] = useState('')
    const [questionType, setQuestionType] = useState('MCQ')
    const [questionText, setQuestionText] = useState('')
    const [marks, setMarks] = useState('')
    const [options, setOptions] = useState(['', '', '', ''])
    const [correctAnswer, setCorrectAnswer] = useState('')

    const [pendingQuestions, setPendingQuestions] = useState([])
    const [savedQuestions, setSavedQuestions] = useState([])
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const selectedExamData = examinations.find(
        exam => String(exam.id) === String(selectedExam)
    )

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('examease_token')}`
    })

    // Load questions already saved for this examination
    const loadSavedQuestions = async (examId) => {
        if (!examId) return

        try {
            setLoading(true)

            const response = await fetch(
                `${API_URL}/${examId}/questions`,
                { headers: getHeaders() }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Could not load saved questions.')
            }

            const list = Array.isArray(data)
                ? data
                : data.questions || []

            setSavedQuestions(list.map((question, index) => ({
                ...question,
                id: question.question_id ?? question.id ?? index,
                text: question.question_text ?? question.text,
                type: question.question_type ?? question.type,
                options: Array.isArray(question.options)
                    ? question.options
                    : typeof question.options === 'string'
                        ? JSON.parse(question.options || '[]')
                        : [],
                marks: question.marks
            })))
        } catch (err) {
            console.error('Question loading:', err)
            setSavedQuestions([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (selectedExam) {
            loadSavedQuestions(selectedExam)
        } else {
            setSavedQuestions([])
        }
    }, [selectedExam])

    const resetForm = () => {
        setQuestionText('')
        setMarks('')
        setOptions(['', '', '', ''])
        setCorrectAnswer('')
    }

    const handleOptionChange = (index, value) => {
        const updatedOptions = [...options]
        updatedOptions[index] = value
        setOptions(updatedOptions)
    }

    // Add a question to the temporary list
    const handleAddQuestion = (event) => {
        event.preventDefault()
        setError('')
        setSuccess('')

        if (!selectedExam) {
            setError('Please select an examination.')
            return
        }

        if (questionType === 'MCQ') {
            if (options.some(option => !option.trim())) {
                setError('Please fill in all four options.')
                return
            }

            if (correctAnswer === '') {
                setError('Please select the correct answer.')
                return
            }

            if (new Set(options.map(option => option.trim())).size !== 4) {
                setError('Please enter four different options.')
                return
            }
        }

        const newQuestion = {
            id: `${Date.now()}_${pendingQuestions.length}`,
            question_text: questionText.trim(),
            question_type: questionType,
            options: questionType === 'MCQ'
                ? options.map(option => option.trim())
                : [],
            correct_option_id: questionType === 'MCQ'
                ? options[Number(correctAnswer)].trim()
                : null,
            grading_rubric: questionType === 'DESCRIPTIVE'
                ? 'Manual evaluation by examiner'
                : null,
            marks: Number(marks),
            negative_marks: 0
        }

        setPendingQuestions(previous => [...previous, newQuestion])
        resetForm()
        setSuccess('Question added to your pending list.')
    }

    // Save all prepared questions together in the database
    const handleSaveAll = async () => {
        if (!selectedExam || pendingQuestions.length === 0) {
            setError('Please add at least one question first.')
            return
        }

        try {
            setSaving(true)
            setError('')
            setSuccess('')

            const questionsToSave = pendingQuestions.map(
                ({ id, ...question }, index) => ({
                    ...question,
                    question_order: savedQuestions.length + index + 1
                })
            )

            const response = await fetch(
                `${API_URL}/${selectedExam}/questions/bulk`,
                {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({
                        questions: questionsToSave
                    })
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Could not save questions.')
            }

            setSuccess(
                `${pendingQuestions.length} question(s) saved successfully!`
            )

            setPendingQuestions([])
            await loadSavedQuestions(selectedExam)
        } catch (err) {
            setError(err.message || 'Question saving failed.')
        } finally {
            setSaving(false)
        }
    }

    const removePendingQuestion = (id) => {
        setPendingQuestions(previous =>
            previous.filter(question => question.id !== id)
        )
    }

    const allQuestions = [...savedQuestions, ...pendingQuestions]

    return (
        <div className="question-management">

            <header className="question-header">
                <h1>Question Management</h1>
                <p>Add and manage questions for your examinations.</p>
            </header>

            <section className="question-form-card">

                <h2>Select Examination</h2>

                {examinations.length === 0 ? (
                    <p className="empty-questions">
                        Please create an examination first.
                    </p>
                ) : (
                    <>
                        <select
                            value={selectedExam}
                            onChange={(e) => {
                                setSelectedExam(e.target.value)
                                setPendingQuestions([])
                                setError('')
                                setSuccess('')
                                resetForm()
                            }}
                        >
                            <option value="">Select an examination</option>

                            {examinations.map(exam => (
                                <option key={exam.id} value={String(exam.id)}>
                                    {exam.title} - {exam.subject}
                                </option>
                            ))}
                        </select>

                        {selectedExam && (
                            <>
                                <div className="exam-details">
                                    <p>
                                        <strong>Examination:</strong>{' '}
                                        {selectedExamData?.title}
                                    </p>
                                    <p>
                                        <strong>Duration:</strong>{' '}
                                        {selectedExamData?.duration} minutes
                                    </p>
                                </div>

                                <form onSubmit={handleAddQuestion}>

                                    <h2>Add New Question</h2>

                                    <label>Question Type</label>
                                    <select
                                        value={questionType}
                                        onChange={(e) => {
                                            setQuestionType(e.target.value)
                                            setOptions(['', '', '', ''])
                                            setCorrectAnswer('')
                                        }}
                                    >
                                        <option value="MCQ">
                                            Multiple Choice Question
                                        </option>
                                        <option value="DESCRIPTIVE">
                                            Descriptive Question
                                        </option>
                                    </select>

                                    <label>Question</label>
                                    <textarea
                                        placeholder="Enter your question here..."
                                        value={questionText}
                                        onChange={(e) => setQuestionText(e.target.value)}
                                        required
                                    />

                                    {questionType === 'MCQ' && (
                                        <div className="options-container">
                                            <h3>Answer Options</h3>

                                            {options.map((option, index) => (
                                                <div className="option-field" key={index}>
                                                    <label>
                                                        Option {index + 1}
                                                    </label>

                                                    <input
                                                        type="text"
                                                        placeholder={`Enter option ${index + 1}`}
                                                        value={option}
                                                        onChange={(e) =>
                                                            handleOptionChange(
                                                                index,
                                                                e.target.value
                                                            )
                                                        }
                                                        required
                                                    />
                                                </div>
                                            ))}

                                            <label>Correct Answer</label>
                                            <select
                                                value={correctAnswer}
                                                onChange={(e) =>
                                                    setCorrectAnswer(e.target.value)
                                                }
                                                required
                                            >
                                                <option value="">
                                                    Select correct option
                                                </option>

                                                {options.map((option, index) => (
                                                    option.trim() && (
                                                        <option
                                                            key={index}
                                                            value={String(index)}
                                                        >
                                                            Option {index + 1}
                                                        </option>
                                                    )
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {questionType === 'DESCRIPTIVE' && (
                                        <p className="descriptive-note">
                                            Descriptive answers will be evaluated manually.
                                        </p>
                                    )}

                                    <label>Marks</label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Enter marks"
                                        value={marks}
                                        onChange={(e) => setMarks(e.target.value)}
                                        required
                                    />

                                    <button type="submit">
                                        Add Question to List
                                    </button>
                                </form>

                                {error && (
                                    <p role="alert" style={{ color: 'red' }}>
                                        {error}
                                    </p>
                                )}

                                {success && (
                                    <p role="status" style={{ color: 'green' }}>
                                        {success}
                                    </p>
                                )}

                                {pendingQuestions.length > 0 && (
                                    <div className="pending-questions">
                                        <h2>
                                            Questions Ready to Save ({pendingQuestions.length})
                                        </h2>

                                        {pendingQuestions.map((question, index) => (
                                            <div
                                                className="saved-question-card"
                                                key={question.id}
                                            >
                                                <h3>Question {index + 1}</h3>
                                                <p>{question.question_text}</p>
                                                <span>{question.question_type}</span>
                                                <span>{question.marks} Marks</span>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removePendingQuestion(question.id)
                                                    }
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={handleSaveAll}
                                            disabled={saving}
                                        >
                                            {saving
                                                ? 'Saving Questions...'
                                                : `Save All ${pendingQuestions.length} Questions`}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </section>

            {selectedExam && (
                <section className="saved-questions">
                    <h2>
                        Questions for Selected Examination ({allQuestions.length})
                    </h2>

                    {loading ? (
                        <p>Loading saved questions...</p>
                    ) : allQuestions.length === 0 ? (
                        <p className="empty-questions">
                            No questions added to this examination yet.
                        </p>
                    ) : (
                        allQuestions.map((question, index) => (
                            <div
                                className="saved-question-card"
                                key={question.id}
                            >
                                <h3>Question {index + 1}</h3>
                                <p>{question.question_text ?? question.text}</p>
                                <span>
                                    {question.question_type ?? question.type}
                                </span>
                                <span>{question.marks} Marks</span>

                                {question.options?.length > 0 && (
                                    <div className="saved-options">
                                        {question.options.map((option, i) => (
                                            <p key={i}>
                                                {String.fromCharCode(65 + i)}. {option}
                                            </p>
                                        ))}
                                    </div>
                                )}

                                {pendingQuestions.some(
                                    pending => pending.id === question.id
                                ) && (
                                        <p>Not saved to database yet</p>
                                    )}
                            </div>
                        ))
                    )}
                </section>
            )}
        </div>
    )
}

export default QuestionManagement
