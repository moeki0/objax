import { useEffect, useState } from "react";
import { IoCloseSharp } from "react-icons/io5";
import { Rnd } from "react-rnd";

export function Help({
  help,
  setHelp,
}: {
  help: boolean;
  setHelp: (help: boolean) => void;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const scroller = document.querySelector(".scroller");
    if (!scroller) {
      return;
    }
    const handleScroll = () => {
      setPos({
        x: scroller.scrollTop + window.innerHeight / 2 - 200,
        y: scroller.scrollLeft + window.innerWidth / 2 - 180,
      });
    };
    scroller.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => {
      scroller.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!help) {
    return;
  }

  return (
    <Rnd
      default={{
        x: pos.x,
        y: pos.y,
        width: 360,
        height: 400,
      }}
      draggablehandle=".header"
      className="border border-gray-300 shadow-xl rounded z-9999 bg-white"
    >
      <div className="header h-7 w-full bg-gray-50 text-gray-500 px-1 rounded border-b border-gray-300 flex items-center">
        <button
          onClick={() => setHelp(false)}
          className="border border-gray-300 bg-white p-px"
        >
          <IoCloseSharp />
        </button>
      </div>
      <div className="p-3 overflow-scroll h-[calc(100%-30px)]">
        <pre className="break-all text-wrap text-xs">
          {`# Basics (name is required)
name is Hello

# Base style / position and size
width is 100
height is 100
x is 100
y is 100
# decimal numbers are supported
opacity is 0.25

# CSS Style (style** fields)
styleBorder is "1px solid #ddd"

# Image
image is "https://example.com/image.png"

# Visibility / editability
visible is true
editable is true

# Custom fields
visible is state
state is false

# Parent/child layout
sticky ParentThing

# Duplicate metadata
duplicate CopyOfSomething

# Transition / Operation
onClick is Hello.toggle
transition toggle of Hello.state is [false, true]

onKeyDownA is Hello.left
operation left of Hello.x is { it - 10 }

onIntervalWith1000ms is Hello.right
operation right of Hello.x is { it - 10 }

# Strings / concatenation
text is "Hello, world!"
text is "TextA" _ "TextB"

# Arrays / range expansion
name is MessageData
list is ["Hello"]
text is MessageData.list.1
numbers is [1..5, 9, 6..2]   # -> [1,2,3,4,5,9,6,5,4,3,2]

# _ is array concat/union
operation send of MessageData.list is { [Input.text] _ it }

# Comparison
visible is Count.num > 10
visible is Count.num >= 10
visible is Count.num < 10
visible is Count.num <= 10
visible is Count.num == 10
visible is Count.num != 10

# Arithmetic
width is 10 + 10
width is 20 - 10
width is 10 / 3
width is 100 * 100
width is 10 % 3
width is 2 ^ 3      # also works with **

# Math functions
width is sin(Time.second)
height is cos(Time.second)
width is sqrt(9)
height is abs(-10)
width is max(10, 20, 5)

# Constants
radius is pi * 10
growth is e ^ 2

# Logical
visible is Hello.state and Hi.state
visible is Hello.state or Hi.state
visible is not Hello.state

# Time namespace (date/time)
text is Time.year _ "/" _ Time.month _ "/" _ Time.date
text is "Weekday is " _ Time.day
text is Time.hour _ ":" _ Time.minute _ ":" _ Time.second
# Time.minisecond
# Time.epochSeconds / Time.unix
# Time.epochMilliseconds / Time.epochMiliseconds / Time.unixMs

# = also works for assignment
title = "hello"
flag is true

# Non-ASCII names are allowed (e.g., Japanese)
name is 世界
operation 計算 of 対象.値 is { 1 + 1 }
transition 状態遷移 of 利用者.状態 is [0, 1]
onClick is ハンドラ.開始
duplicate 複製
`}
        </pre>
      </div>
    </Rnd>
  );
}
