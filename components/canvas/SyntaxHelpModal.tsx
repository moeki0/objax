type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function SyntaxHelpModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-1000 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full sm:w-[720px] max-h-[80vh] rounded shadow-xl border border-gray-300 m-0 sm:m-8 overflow-scroll">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-300">
          <div className="font-medium">Syntax Cheat Sheet</div>
          <button
            className="text-gray-600 hover:text-black"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-4 text-sm leading-6 overflow-auto">
          <p className="mb-3">A quick overview of the mini-language used in this canvas.</p>

          <div className="mb-4">
            <div className="font-semibold mb-1">Basics</div>
            <pre className="bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap">
              {`<Name> is <Value>
duplicate <Name>
sticky <Name>
on <Event> is <Reference>
transition <Name> of <Reference> is [<Value>, <Value>, ...]
if <Condition> then <Statement>
`}
            </pre>
          </div>

          <div className="mb-4">
            <div className="font-semibold mb-1">Values</div>
            <ul className="list-disc pl-5">
              <li>Number: 123</li>
              <li>{'String: "hello"'}</li>
              <li>Boolean: true / false</li>
              <li>{'Array: [1, 2, "a"]'}</li>
              <li>
                Reference: <code>Name.Field</code> (dot-separated)
              </li>
            </ul>
          </div>

          <div className="mb-4">
            <div className="font-semibold mb-1">Conditions and Expressions</div>
            <ul className="list-disc pl-5">
              <li>
                <code>A eq B</code> equality check (A and B are values or references)
              </li>
              <li>
                Logical And/Or: <code>true and false</code>,<code> A eq B or C eq D</code>
              </li>
              <li>
                Logical Not: <code>not (A eq B)</code>
              </li>
              <li>
                Add/Sub: <code>1 + 2 - 3</code>
              </li>
              <li>
                Mul/Div: <code>1 * 2 / 3</code>
              </li>
              <li>
                Grouping: <code>(1 + 2) * 3</code>
              </li>
            </ul>
          </div>

          <div className="mb-4">
            <div className="font-semibold mb-1">Examples</div>
            <pre className="bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap">
              {`title is "Hello"
count is 1
sticky Parent
duplicate Original
on click is action.run
onIntervalWith1000ms is Timer.second
transition State of input.state is ["idle", "running"]
if count eq 1 then title is "Once"`}
            </pre>
          </div>

          <div className="text-xs text-gray-500">
            Note: Names may include Japanese characters, alphanumerics, and underscores.
          </div>
        </div>
      </div>
    </div>
  );
}
