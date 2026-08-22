"use client"

import { useRef, useState } from "react"

export default function Toggle({question, answer}: {question: string, answer: string}) {
    const toggleRef = useRef<HTMLButtonElement>(null)
    const [isOn, setIsOn] = useState<boolean>(false)

    const handleToggle = () => {
        setIsOn(!isOn)
    }

    return (
        <>
        <button onClick={handleToggle} ref={toggleRef} className="flex justify-between w-full py-2">
            {question}
        </button>
        <div className={`${isOn ? 'max-h-none opacity-100 transition-all duration-300' : 'max-h-0 opacity-0 overflow-hidden transition-all duration-300'}`}>
            <p dangerouslySetInnerHTML={{ __html: answer }} />
        </div>
        </>
    )
}