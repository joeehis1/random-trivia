import { useEffect, useRef, useState } from "react";

import correct from "./assets/correct.wav";
import incorrect from "./assets/incorrect.wav";
import { entitiesArray } from "./entities";
const initialDuration = 75;

function App() {
    const [currentView, setCurrentView] = useState("intro");

    const [finalScore, setFinalScore] = useState(0);
    // final score is set when the quiz is ended by the quiz component using a ref value, finalScore.current

    const [timerStatus, setTimerStatus] = useState("idle");
    const [duration, setDuration] = useState(initialDuration);
    const interval = useRef(null);
    const correctAudioRef = useRef(null);
    const incorrectAudioRef = useRef(null);

    // state variable that is set when any answer is right or wrong.
    // might not need to be a top lovel state variable anymore

    const [isCorrect, setIsCorrect] = useState(null);

    const cantView = currentView === "quiz" || currentView === "form";

    const viewHighScores = () => {
        setCurrentView("scores");
    };

    useEffect(() => {
        if (timerStatus === "started") {
            interval.current = setInterval(() => {
                if (duration - 1 <= 0) {
                    setDuration(0);
                    setTimerStatus("expired");

                    clearInterval(interval.current);
                } else {
                    setDuration((dur) => dur - 1);
                }
            }, 1000);
        }

        return () => clearInterval(interval.current);
    }, [duration, timerStatus, isCorrect]);

    return (
        <>
            <header>
                <button disabled={cantView} onClick={viewHighScores}>
                    View High Scores
                </button>
                <Timer duration={duration} />
                <audio ref={correctAudioRef} src={correct}></audio>
                <audio ref={incorrectAudioRef} src={incorrect}></audio>
            </header>

            <>
                {currentView === "intro" && (
                    <IntroScreen
                        startQuiz={() => {
                            setTimerStatus("started");
                            setCurrentView("quiz");
                        }}
                    />
                )}
                {currentView === "quiz" && (
                    <QuizComponent
                        endQuiz={(finalScore) => {
                            clearInterval(interval.current);
                            setCurrentView("form");
                            setFinalScore(finalScore);
                        }}
                        playSound={(isCorrect) => {
                            if (isCorrect) {
                                correctAudioRef.current.play();
                            } else {
                                incorrectAudioRef.current.play();
                            }
                        }}
                        reduceDuration={(isCorrect) => {
                            setDuration((dur) =>
                                !isCorrect && dur - 5 < 0
                                    ? 0
                                    : !isCorrect && dur - 5 <= 0
                                    ? 0
                                    : !isCorrect
                                    ? dur - 5
                                    : dur
                            );
                        }}
                        markAnswer={(isCorrect) => {
                            setIsCorrect(isCorrect);
                        }}
                        isCorrect={isCorrect}
                        timerStatus={timerStatus}
                    />
                )}
                {currentView === "form" && (
                    <FormSection
                        finalScore={finalScore}
                        showHighScores={viewHighScores}
                    />
                )}
                {currentView === "scores" && (
                    <HighScores
                        goToStartScreen={() => {
                            setCurrentView("intro");
                            setFinalScore(0);
                            setDuration(initialDuration);
                        }}
                    />
                )}
            </>
        </>
    );
}

function Timer({ duration }) {
    return <p>Time Remaining: {duration}</p>;
}

function getData(key) {
    return JSON.parse(localStorage.getItem(key)) ?? [];
}

function HighScores({ goToStartScreen }) {
    const [scores, setScores] = useState(getData("saved-scores"));

    function clearHighScores() {
        setScores([]);
        localStorage.removeItem("saved-scores");
    }
    return (
        <section>
            <h2>See Scores Below</h2>
            <ul>
                {scores.map((score) => {
                    return (
                        <li key={score.id}>
                            <span>{score.userName}</span>
                            <span>{score.finalScore}</span>
                        </li>
                    );
                })}
            </ul>
            <button
                onClick={() => {
                    goToStartScreen();
                }}
            >
                Go Back
            </button>
            <button
                onClick={() => {
                    clearHighScores();
                }}
            >
                Clear HighScores
            </button>
        </section>
    );
}

function FormSection({ finalScore, showHighScores }) {
    const [userName, setUserName] = useState("");
    const canSubmit = userName.trim();
    function handleForm() {
        if (!canSubmit) return;
        // Save to localStorage
        let existingDataSet = JSON.parse(localStorage.getItem("saved-scores"));
        if (!existingDataSet) {
            existingDataSet = [];
        }
        existingDataSet = [
            { userName, finalScore, id: window.crypto.randomUUID() },
            ...existingDataSet,
        ];
        localStorage.setItem("saved-scores", JSON.stringify(existingDataSet));
        showHighScores();
    }
    return (
        <section>
            <h2>All Done. Your Final Score is {finalScore}.</h2>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleForm();
                }}
            >
                <div className="form-input">
                    <label>Enter your initials: </label>
                    <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        required
                    />
                </div>
                <button>Submit</button>
            </form>
        </section>
    );
}

function cleanUp(text) {
    for (let chars of entitiesArray) {
        let re = new RegExp(chars.htmlEntity, "g");
        text = text.replaceAll(re, chars.equivalent);
    }

    return text;
}

function QuizComponent({
    endQuiz,
    markAnswer,
    isCorrect,
    timerStatus,
    playSound,
    reduceDuration,
}) {
    // After component mounts quizQuestions is set by the useEffect call that runs once
    const [quizQuestions, setQuizQuestions] = useState(null);
    // FinalScore is a ref value that changes across renders. A state value might have worked but this just avoids unnecessary headache
    const finalScore = useRef(0);
    // question index is a value that changes to render a list item
    const [questionIndex, setQuestionIndex] = useState(0);
    // ref to setAnswers
    const [answerSelected, setAnswerSelected] = useState(false);
    // ref to setAnswers

    // ref to setAnswers
    const [currentSelection, setCurrentSelection] = useState(null);

    // this is an additional useEffect to control what happens when the timer runs out
    useEffect(() => {
        if (timerStatus === "expired") {
            endQuiz(finalScore.current);
        }
    }, [timerStatus, endQuiz]);

    // this is the initial useEffect that gets the data from the server

    useEffect(() => {
        fetch("https://opentdb.com/api.php?amount=5")
            .then((res) => res.json())
            .then((data) => {
                console.log(data.results);
                setQuizQuestions(data.results);
            });
    }, []);

    function setAnswers(selectedAnswer, correctAnswer) {
        // SetAnswers is the event handler for the click event on each button
        // selectedAnswer is the answer selected

        // answerSelected is a boolean that determines whether the result pane should show up. It is set to disappear after a small delay
        // This function sets what list item to display by incrementing the question index state value 1.5s after setting selectedAnswer and isCorrect.
        // However if we've gotten to the end of the quiz questions, then the endQuiz function is called. This endQuiz function is defined is a prop of this Quiz component in the App component
        setCurrentSelection(selectedAnswer);
        finalScore.current =
            selectedAnswer === correctAnswer
                ? finalScore.current + 20
                : finalScore.current + 0;
        setAnswerSelected(true);
        reduceDuration(selectedAnswer === correctAnswer);
        markAnswer(selectedAnswer === correctAnswer);
        playSound(selectedAnswer === correctAnswer);
        if (questionIndex + 1 >= quizQuestions.length) {
            // setAnswerSelected(true);
            // setIsCorrect(selectedAnswer === correctAnswer);
            const timeoutId = setTimeout(() => {
                endQuiz(finalScore.current);
            }, 1500);
        } else {
            // setAnswerSelected(true);
            // setIsCorrect(selectedAnswer === correctAnswer);
            const timeoutId = setTimeout(() => {
                markAnswer(null);
                setQuestionIndex((num) => num + 1);
                setAnswerSelected(false);
                setCurrentSelection(null);
            }, 1500);
        }
    }

    return !quizQuestions ? (
        <section>
            <p>Loading Quiz</p>
        </section>
    ) : (
        <section>
            <ul>
                {quizQuestions.map((question, index) => {
                    const answerList = [
                        question.correct_answer,
                        ...question.incorrect_answers,
                    ];
                    const answersLi = answerList.map((answer) => {
                        return (
                            <li key={answer}>
                                <button
                                    style={{
                                        backgroundColor:
                                            answerSelected &&
                                            currentSelection === answer &&
                                            currentSelection ===
                                                question.correct_answer
                                                ? "blue"
                                                : answerSelected &&
                                                  currentSelection === answer &&
                                                  currentSelection !==
                                                      question.correct_answer
                                                ? "red"
                                                : answerSelected &&
                                                  answer ===
                                                      question.correct_answer
                                                ? "blue"
                                                : "",
                                    }}
                                    disabled={answerSelected}
                                    onClick={() => {
                                        setAnswers(
                                            answer,
                                            question.correct_answer
                                        );
                                    }}
                                >
                                    {cleanUp(answer)}
                                </button>
                            </li>
                        );
                    });
                    return (
                        index === questionIndex && (
                            <li key={question.question}>
                                {cleanUp(question.question)}
                                <ul>{answersLi}</ul>
                                {answerSelected && (
                                    <p>{isCorrect ? "Correct" : "Wrong"}</p>
                                )}
                            </li>
                        )
                    );
                })}
            </ul>
        </section>
    );
}

function IntroScreen({ startQuiz }) {
    // startQuiz is a function that sets the quizStarted property in the App component, once this property is set to true the quiz starts and this introScreen component is removed from the DOM
    return (
        <>
            <section>
                <h1>Trivia</h1>
                <p>
                    Welcome to the ultimate trivia challenge. Every time you
                    restart the game, you will be challenged with a different
                    set of questions that belong to a completely different
                    category. Have Fun!!!
                </p>
                <button onClick={() => startQuiz()}>Start Quiz</button>
            </section>
        </>
    );
}

export default App;
