import { SKILLS } from '../helper/categories';

/** Toggleable skill chips. value: string[]; onChange(newArray). */
function SkillPicker({ value = [], onChange }) {
  const toggle = (skill) => {
    onChange(value.includes(skill) ? value.filter(s => s !== skill) : [...value, skill]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {SKILLS.map(skill => {
        const selected = value.includes(skill);
        return (
          <button
            key={skill}
            type="button"
            onClick={() => toggle(skill)}
            aria-pressed={selected}
            className={`px-3 py-1 rounded-full border text-sm transition ${
              selected
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:border-orange-400'
            }`}
          >
            {skill}
          </button>
        );
      })}
    </div>
  );
}

export default SkillPicker;
