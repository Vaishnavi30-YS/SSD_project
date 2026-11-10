

import { useState } from 'react'
import './QuestionManagement.css'

function QuestionManagement({ examinations }) {
    const [selectedExam, setSelectedExam] = useState('')
    const [questionType, setQuestionType] = useState('MCQ')
    const [questionText, setQuestionText] = useState('')
    const [marks, setMarks] = useState('')
    const [options, setOptions] = useState(['', '', '', ''])
    const [correctAnswer, setCorrectAnswer] = useState('')
    const [questions, setQuestions] = useState({})

    const currentQuestions = questions[selectedExam] || []

    const handleOptionChange = (index, value) => {
        const updatedOptions = [...options]
        updatedOptions[index] = value
        setOptions(updatedOptions)
    }

    const handleAddQuestion = (event) => {
        event.preventDefault()

        if (!selectedExam) {
            alert('Please select an examination.')
            return
        }

        if (
            questionType === 'MCQ' &&
            options.some(option => !option.trim())
        ) {
            alert('Please fill in all four options.')
            return
        }

        if (questionType === 'MCQ' && correctAnswer === '') {
            alert('Please select the correct answer.')
            return
        }

        const newQuestion = {
            id: Date.now(),
            type: questionType,
            text: questionText,
            marks: Number(marks),
            options: questionType === 'MCQ' ? [...options] : [],
            correctAnswer: questionType === 'MCQ' ? correctAnswer : null
        }

        setQuestions(prev => ({
            ...prev,
            [selectedExam]: [...(prev[selectedExam] || []), newQuestion]
        }))

        setQuestionText('')
        setMarks('')
        setOptions(['', '', '', ''])
        setCorrectAnswer('')
    }

    return (
        <div className="question-management">

            <header className="question-header">
                <h1>Question Management</h1>
                <p>Add questions to a particular examination.</p>
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
                                setQuestionText('')
                                setMarks('')
                                setOptions(['', '', '', ''])
                                setCorrectAnswer('')
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
                                                <label>Option {index + 1}</label>

                                                <input
                                                    type="text"
                                                    placeholder={`Enter option ${index + 1}`}
                                                    value={option}
                                                    onChange={(e) =>
                                                        handleOptionChange(index, e.target.value)
                                                    }
                                                    required
                                                />
                                            </div>
                                        ))}

                                        <label>Correct Answer</label>

                                        <select
                                            value={correctAnswer}
                                            onChange={(e) => setCorrectAnswer(e.target.value)}
                                            required
                                        >
                                            <option value="">Select correct option</option>

                                            {options.map((option, index) => (
                                                option.trim() && (
                                                    <option key={index} value={String(index)}>
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

                                <button type="submit">Add Question</button>

                            </form>
                        )}
                    </>
                )}

            </section>

            {selectedExam && (
                <section className="saved-questions">

                    <h2>Questions for Selected Examination ({currentQuestions.length})</h2>

                    {currentQuestions.length === 0 ? (
                        <p className="empty-questions">
                            No questions added to this examination yet.
                        </p>
                    ) : (
                        currentQuestions.map((question, index) => (
                            <div className="saved-question-card" key={question.id}>

                                <h3>Question {index + 1}</h3>

                                <p>{question.text}</p>

                                <span>{question.type}</span>
                                <span>{question.marks} Marks</span>

                                {question.type === 'MCQ' && (
                                    <div className="saved-options">

                                        {question.options.map((option, i) => (
                                            <p key={i}>
                                                {String.fromCharCode(65 + i)}. {option}
                                            </p>
                                        ))}

                                        <strong>
                                            Correct Answer: Option {Number(question.correctAnswer) + 1}
                                        </strong>

                                    </div>
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
