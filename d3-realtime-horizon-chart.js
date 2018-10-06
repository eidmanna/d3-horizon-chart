import html from "@observablehq/notebook-stdlib/src/html.js";
import DOM from "@observablehq/notebook-stdlib/src/dom/index.js";
import Promises from "@observablehq/notebook-stdlib/src/promises/index.js";

import * as d3 from "d3";
// console.log(html);
const overlap = 7;
const width = 800;
const step = 29;
const margin = {
  top: 30,
  right: 10,
  bottom: 0,
  left: 10
};


const x = d3.scaleTime()
  .range([0, width]);

const walk = function (v) {
  return Math.max(0, Math.min(1, v + (Math.random() - 0.5) * 0.05));
}

const data = (() => {
  const n = 40,
    m = 964;
  const data = new Array(n);
  for (let i = 0; i < n; ++i) {
    const d = data[i] = new Float64Array(m);
    for (let j = 0, v = 0; j < m; ++j) {
      d[j] = v = walk(v);
    }
  }
  return data;
})();

const y = d3.scaleLinear()
  .rangeRound([0, -overlap * step]);

const xAxis = g => g
  .attr("transform", `translate(0,${margin.top})`)
  .call(d3.axisTop(x).ticks(width / 80).tickSizeOuter(0))
  .call(g => g.selectAll(".tick").filter(d => x(d) < margin.left ||
    x(d) >= width - margin.right).remove())
  .call(g => g.select(".domain").remove());

const height = data.length * (step + 1) + margin.top + margin.bottom;



const chartFct = function () {


  const color = i => d3["schemeGreens"][Math.max(3, overlap)][i + Math.max(0, 3 - overlap)];

  const div = html `<div style="position:relative;">`;

  const canvas = d3.select(div)
    .selectAll("canvas")
    .data(data)
    .enter().append(() => DOM.context2d(width, step, 1).canvas)
    .style("position", "absolute")
    .style("image-rendering", "pixelated")
    .style("top", (d, i) => `${i * (step + 1) + margin.top}px`)
    .property("context", function () {
      return this.getContext("2d");
    });
    //.each(horizon);

  const svg = d3.select(div.appendChild(DOM.svg(width, height)))
    .style("position", "relative")
    .style("font", "10px sans-serif");

  // placeholder for x axis  
  const gX = svg.append("g");

  // draw y axis
  svg.append("g")
    .selectAll("text")
    .data(data)
    .enter().append("text")
    .attr("x", 4)
    .attr("y", (d, i) => (i + 0.5) * (step + 1) + margin.top)
    .attr("dy", "0.35em")
    .text((d, i) => i + 'TTT') ;

  // mouse over rule  
  const rule = svg.append("line")
    .attr("stroke", "#000")
    .attr("y1", margin.top - 6)
    .attr("y2", height - margin.bottom - 1)
    .attr("x1", 0.5)
    .attr("x2", 0.5);

  svg.on("mousemove touchmove", () => {
    const x = d3.mouse(svg.node())[0] + 0.5;
    rule.attr("x1", x).attr("x2", x);
  });

  function horizon(d) {
    const {
      context
    } = this;
    const {
      length: k
    } = d;
    if (k < width) context.drawImage(this, k, 0, width - k, step, 0, 0, width - k, step);
    context.fillStyle = "#fff";
    context.fillRect(width - k, 0, k, step);
    for (let i = 0; i < overlap; ++i) {
      context.save();
      context.translate(width - k, (i + 1) * step);
      context.fillStyle = color(i);
      for (let j = 0; j < k; ++j) {
        context.fillRect(j, y(d[j]), 1, -y(d[j]));
      }
      context.restore();
    }
  }

  div.update = data => {
    canvas.data(data).each(horizon);
    gX.call(xAxis);
  };
  return div;
  
};

const chartTriggerFct = async function* (div) {
  const period = 500,
    m = data[0].length;
  const tail = data.map(d => d.subarray(m - 1, m));
  while (true) {
    const then = new Date(Math.ceil((Date.now() + 1) / period) * period);

    yield Promises.when(then, then);
    for (const d of data) d.copyWithin(0, 1, m), d[m - 1] = walk(d[m - 1]);
    x.domain([then - period * width, then]);
    div.update(tail);
  }
};


const notebook = async () => {

  const div = chartFct();
  d3.select("body").append(() => div );


  const trigger = chartTriggerFct(div);

  (async () => {
    while (true) {
      await trigger.next().then( t => console.log(t.value));
    }
  })();
  
};
export default notebook;