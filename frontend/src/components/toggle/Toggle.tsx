"use client"

import { useRef, useState } from "react"

export default function Toggle({ question, answer }: { question: string, answer: string }) {
    const toggleRef = useRef<HTMLButtonElement>(null)
    const [isOn, setIsOn] = useState<boolean>(false)

    const handleToggle = () => {
        setIsOn(!isOn)
    }

    return (
        <div className="toggle-container">
            <button onClick={handleToggle} ref={toggleRef} className="flex justify-between w-full py-2 hover:bg-(--grey) hover:text-(--background) transition-all duration-300 px-2 rounded-t-lg cursor-pointer border-b-2 border-(--grey) text-md">
                {question}
            </button>
            <div className={`grid transition-all duration-500 px-2 ${isOn ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}>
                <div className="overflow-hidden">
                    <div className="pt-4 text-sm">
                        <p dangerouslySetInnerHTML={{ __html: answer }} />
                    </div>
                </div>
            </div>


        </div>
    )
}