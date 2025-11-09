const harmonies = {
  analogous: {
    name: "Analogous Colors",
    description:
      "Analogous colors sit next to each other on the color wheel and create natural, cohesive palettes.",
    colors: ["#f94144", "#f3722c", "#f8961e", "#f9844a", "#f9c74f"]
  },
  complementary: {
    name: "Complementary Colors",
    description:
      "Complementary colors are opposite on the color wheel, creating strong contrast and vibrant looks.",
    colors: ["#118ab2", "#ef476f"]
  },
  triadic: {
    name: "Triadic Colors",
    description:
      "Triadic colors are evenly spaced around the color wheel, balancing vibrancy and harmony.",
    colors: ["#06d6a0", "#ef476f", "#118ab2"]
  },
  tetradic: {
    name: "Tetradic Colors",
    description:
      "Tetradic colors form a rectangle on the color wheel — two complementary pairs that offer variety and balance.",
    colors: ["#06d6a0", "#ffd166", "#ef476f", "#118ab2"]
  },
  monochromatic: {
    name: "Monochromatic Colors",
    description:
      "Monochromatic palettes use variations in lightness and saturation of a single color for a clean, cohesive design.",
    colors: ["#457b9d", "#5a91b6", "#7bb0d2", "#a8cee6", "#cfe4f3"]
  }
};

const preview = document.getElementById("palette-preview");
const nameEl = document.getElementById("harmony-name");
const descEl = document.getElementById("harmony-description");
const buttons = document.querySelectorAll(".harmony-selector button");

function renderHarmony(type) {
  const harmony = harmonies[type];
  nameEl.textContent = harmony.name;
  descEl.textContent = harmony.description;

  preview.innerHTML = "";
  harmony.colors.forEach((color) => {
    const div = document.createElement("div");
    div.className = "palette-color";
    div.style.background = color;
    div.title = color;
    div.addEventListener("click", () => {
      navigator.clipboard.writeText(color);
      div.style.transform = "scale(1.1)";
      setTimeout(() => (div.style.transform = "scale(1)"), 150);
    });
    preview.appendChild(div);
  });

  buttons.forEach((b) => b.classList.remove("active"));
  document.querySelector(`[data-type="${type}"]`).classList.add("active");
}

// Default
renderHarmony("analogous");

// Event listeners
buttons.forEach((btn) =>
  btn.addEventListener("click", () => renderHarmony(btn.dataset.type))
);
