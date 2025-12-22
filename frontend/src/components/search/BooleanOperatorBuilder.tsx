import * as React from "react"

interface BooleanOperator {
  label: string
  value: string
}

const operators: BooleanOperator[] = [
  { label: "AND", value: "AND" },
  { label: "OR", value: "OR" },
  { label: "NOT", value: "NOT" },
]

interface BooleanOperatorBuilderProps {
  onChange: (operator: string) => void
}

export const BooleanOperatorBuilder: React.FC<BooleanOperatorBuilderProps> = ({ onChange }) => {
  const [selectedOperator, setSelectedOperator] = React.useState<string>("")

  const handleOperatorChange = (operator: string) => {
    setSelectedOperator(operator)
    onChange(operator)
  }

  return (
    <div className="boolean-operator-builder">
      <label htmlFor="boolean-operators">Select Boolean Operator:</label>
      <select
        id="boolean-operators"
        value={selectedOperator}
        onChange={(e) => handleOperatorChange(e.target.value)}
      >
        <option value="">Select an operator</option>
        {operators.map((operator) => (
          <option key={operator.value} value={operator.value}>
            {operator.label}
          </option>
        ))}
      </select>
    </div>
  )
}