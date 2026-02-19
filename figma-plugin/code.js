"use strict";

// ==================================================
// UX STRATEGY GENERATOR - Figma Plugin
// Generates UX documentation frames from AI response
// ==================================================

var THEMES = {
  dark: {
    bg: { r: 0.027, g: 0.039, b: 0.059 },
    card: { r: 0.047, g: 0.071, b: 0.110 },
    text: { r: 0.914, g: 0.933, b: 0.965 },
    muted: { r: 0.604, g: 0.643, b: 0.698 },
    accent: { r: 0.145, g: 0.388, b: 0.922 },
    success: { r: 0.086, g: 0.639, b: 0.290 },
    warning: { r: 0.851, g: 0.467, b: 0.024 },
    error: { r: 0.863, g: 0.149, b: 0.149 },
    cardBg: { r: 0.08, g: 0.1, b: 0.14 },
    line: { r: 0.2, g: 0.22, b: 0.26 }
  },
  light: {
    bg: { r: 0.961, g: 0.961, b: 0.957 },
    card: { r: 1, g: 1, b: 1 },
    text: { r: 0.110, g: 0.098, b: 0.090 },
    muted: { r: 0.471, g: 0.443, b: 0.424 },
    accent: { r: 0.145, g: 0.388, b: 0.922 },
    success: { r: 0.086, g: 0.639, b: 0.290 },
    warning: { r: 0.851, g: 0.467, b: 0.024 },
    error: { r: 0.863, g: 0.149, b: 0.149 },
    cardBg: { r: 1, g: 1, b: 1 },
    line: { r: 0.906, g: 0.898, b: 0.894 }
  },
  notion: {
    bg: { r: 1, g: 1, b: 1 },
    card: { r: 0.969, g: 0.969, b: 0.965 },
    text: { r: 0.145, g: 0.145, b: 0.145 },
    muted: { r: 0.471, g: 0.443, b: 0.424 },
    accent: { r: 0.145, g: 0.388, b: 0.922 },
    success: { r: 0.086, g: 0.639, b: 0.290 },
    warning: { r: 0.851, g: 0.467, b: 0.024 },
    error: { r: 0.863, g: 0.149, b: 0.149 },
    cardBg: { r: 0.969, g: 0.969, b: 0.965 },
    line: { r: 0.906, g: 0.898, b: 0.894 }
  }
};

var currentTheme = THEMES.dark;

// Layout constants
var LAYOUTS = {
  vertical: {
    cardWidth: 480,
    gap: 20,
    margin: 32,
    columns: 1,
    mode: 'VERTICAL',
    separate: false
  },
  horizontal: {
    cardWidth: 320,
    gap: 16,
    margin: 24,
    columns: 7,  // All 7 cards in a row
    mode: 'HORIZONTAL',
    separate: false
  },
  separate: {
    cardWidth: 400,
    gap: 40,
    margin: 0,
    columns: 4,
    mode: 'NONE',
    separate: true
  }
};

var currentLayout = LAYOUTS.vertical;

// Show UI
figma.showUI(__html__, { width: 420, height: 600 });

// Handle messages from UI
figma.ui.onmessage = function(msg) {
  console.log("Message received:", msg);
  if (msg.type === 'generate') {
    console.log("Starting generation with data:", msg.data);
    generateFrames(msg.data, msg.options);
  }
};

function generateFrames(data, options) {
  Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Regular" }),
    figma.loadFontAsync({ family: "Inter", style: "Medium" }),
    figma.loadFontAsync({ family: "Inter", style: "Bold" })
  ]).then(function() {
    console.log("Fonts loaded successfully");

    currentTheme = THEMES[options.theme] || THEMES.dark;
    currentLayout = LAYOUTS[options.layout] || LAYOUTS.vertical;

    var allFrames = [];

    if (currentLayout.separate) {
      // SEPARATE CARDS: Create each card as independent frame on canvas
      var startX = figma.viewport.center.x - ((currentLayout.cardWidth * 4 + currentLayout.gap * 3) / 2);
      var startY = figma.viewport.center.y - 300;
      var cardIndex = 0;

      var sections = [
        { key: 'project_overview', fn: generateProjectOverviewSeparate },
        { key: 'outline_scope', fn: generateOutlineScopeSeparate },
        { key: 'user_research', fn: generateUserResearchSeparate },
        { key: 'user_persona', fn: generateUserPersonaSeparate },
        { key: 'empathy_map', fn: generateEmpathyMapSeparate },
        { key: 'journey_map', fn: generateJourneyMapSeparate },
        { key: 'research_synthesis', fn: generateResearchSynthesisSeparate }
      ];

      sections.forEach(function(section) {
        if (data[section.key]) {
          var col = cardIndex % currentLayout.columns;
          var row = Math.floor(cardIndex / currentLayout.columns);
          var x = startX + col * (currentLayout.cardWidth + currentLayout.gap);
          var y = startY + row * 500; // Approximate card height + gap

          var card = section.fn(data[section.key], data.projectName);
          card.x = x;
          card.y = y;
          allFrames.push(card);
          cardIndex++;
        }
      });

      figma.currentPage.selection = allFrames;
      figma.viewport.scrollAndZoomIntoView(allFrames);

    } else {
      // CONTAINED LAYOUT: Create main frame with cards inside
      var gridWidth = (currentLayout.cardWidth * currentLayout.columns) +
                      (currentLayout.gap * (currentLayout.columns - 1)) +
                      (currentLayout.margin * 2);

      var mainFrame = figma.createFrame();
      mainFrame.name = "UX Strategy: " + (data.projectName || "Document");
      mainFrame.fills = [{ type: 'SOLID', color: currentTheme.bg }];

      // Set up auto-layout based on selected layout
      mainFrame.layoutMode = currentLayout.mode;
      if (currentLayout.mode === 'HORIZONTAL') {
        mainFrame.layoutWrap = 'NO_WRAP';
        mainFrame.primaryAxisSizingMode = "AUTO";
        mainFrame.counterAxisAlignItems = "MIN";
      } else {
        mainFrame.primaryAxisSizingMode = "AUTO";
      }
      mainFrame.counterAxisSizingMode = "AUTO";
      mainFrame.paddingTop = currentLayout.margin;
      mainFrame.paddingBottom = currentLayout.margin;
      mainFrame.paddingLeft = currentLayout.margin;
      mainFrame.paddingRight = currentLayout.margin;
      mainFrame.itemSpacing = currentLayout.gap;

      // Only set fixed width for vertical layout
      if (currentLayout.mode === 'VERTICAL') {
        mainFrame.resize(gridWidth, 100);
      }

      // Generate cards in order
      if (data.project_overview) {
        generateProjectOverview(mainFrame, data.project_overview);
      }
      if (data.outline_scope) {
        generateOutlineScope(mainFrame, data.outline_scope);
      }
      if (data.user_research) {
        generateUserResearch(mainFrame, data.user_research);
      }
      if (data.user_persona) {
        generateUserPersona(mainFrame, data.user_persona);
      }
      if (data.empathy_map) {
        generateEmpathyMap(mainFrame, data.empathy_map);
      }
      if (data.journey_map) {
        generateJourneyMap(mainFrame, data.journey_map);
      }
      if (data.research_synthesis) {
        generateResearchSynthesis(mainFrame, data.research_synthesis);
      }

      mainFrame.x = figma.viewport.center.x - mainFrame.width / 2;
      mainFrame.y = figma.viewport.center.y - 500;

      figma.currentPage.selection = [mainFrame];
      figma.viewport.scrollAndZoomIntoView([mainFrame]);
    }

    figma.ui.postMessage({ type: 'done' });

  }).catch(function(err) {
    console.error("Error in generateFrames:", err);
    figma.ui.postMessage({ type: 'error', message: err.message || String(err) });
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function createRow(parent, columns, spacing, rowName) {
  var row = figma.createFrame();
  row.name = rowName || "Row";
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "AUTO";
  row.counterAxisSizingMode = "AUTO";
  row.fills = [];
  row.itemSpacing = spacing || 12;
  parent.appendChild(row);
  row.layoutSizingHorizontal = "FILL";
  return row;
}

function createGrid2x2(parent, items, labels) {
  // Container for 2x2 grid
  var grid = figma.createFrame();
  grid.name = "Grid 2x2";
  grid.layoutMode = "VERTICAL";
  grid.primaryAxisSizingMode = "AUTO";
  grid.counterAxisSizingMode = "AUTO";
  grid.fills = [];
  grid.itemSpacing = 10;

  // Top row
  var topRow = figma.createFrame();
  topRow.name = "Top Row";
  topRow.layoutMode = "HORIZONTAL";
  topRow.primaryAxisSizingMode = "AUTO";
  topRow.counterAxisSizingMode = "AUTO";
  topRow.fills = [];
  topRow.itemSpacing = 10;
  grid.appendChild(topRow);

  createGridCell(topRow, labels[0], items[0], currentTheme.accent);
  createGridCell(topRow, labels[1], items[1], currentTheme.warning);
  topRow.layoutSizingHorizontal = "FILL";

  // Bottom row
  var bottomRow = figma.createFrame();
  bottomRow.name = "Bottom Row";
  bottomRow.layoutMode = "HORIZONTAL";
  bottomRow.primaryAxisSizingMode = "AUTO";
  bottomRow.counterAxisSizingMode = "AUTO";
  bottomRow.fills = [];
  bottomRow.itemSpacing = 10;
  grid.appendChild(bottomRow);

  createGridCell(bottomRow, labels[2], items[2], currentTheme.success);
  createGridCell(bottomRow, labels[3], items[3], currentTheme.error);
  bottomRow.layoutSizingHorizontal = "FILL";

  parent.appendChild(grid);
  grid.layoutSizingHorizontal = "FILL";

  return grid;
}


function createGridCell(parent, label, items, accentColor) {
  var cell = figma.createFrame();
  cell.name = label;
  cell.layoutMode = "VERTICAL";
  cell.primaryAxisSizingMode = "AUTO";
  cell.counterAxisSizingMode = "AUTO";
  cell.fills = [{ type: 'SOLID', color: currentTheme.bg, opacity: 0.6 }];
  cell.cornerRadius = 8;
  cell.paddingTop = 12;
  cell.paddingBottom = 12;
  cell.paddingLeft = 12;
  cell.paddingRight = 12;
  cell.itemSpacing = 6;

  var header = figma.createText();
  header.fontName = { family: "Inter", style: "Bold" };
  header.fontSize = 10;
  header.characters = label.toUpperCase();
  header.fills = [{ type: 'SOLID', color: accentColor }];
  cell.appendChild(header);

  var list = Array.isArray(items) && items.length > 0 ? items : ["[Pending]"];
  for (var i = 0; i < list.length; i++) {
    if (!list[i]) continue;
    var itemText = figma.createText();
    itemText.fontName = { family: "Inter", style: "Regular" };
    itemText.fontSize = 10;
    itemText.characters = "• " + String(list[i]);
    itemText.fills = [{ type: 'SOLID', color: currentTheme.text }];
    itemText.textAutoResize = "HEIGHT";
    cell.appendChild(itemText);
    itemText.layoutSizingHorizontal = "FILL";
  }

  parent.appendChild(cell);
  cell.layoutSizingHorizontal = "FILL";
  return cell;
}

function addBadge(parent, text, type) {
  var colors = {
    success: currentTheme.success,
    warning: currentTheme.warning,
    muted: currentTheme.muted,
    accent: currentTheme.accent
  };
  var color = colors[type] || colors.muted;

  var badge = figma.createFrame();
  badge.name = "Badge: " + text;
  badge.layoutMode = "HORIZONTAL";
  badge.primaryAxisSizingMode = "AUTO";
  badge.counterAxisSizingMode = "AUTO";
  badge.fills = [{ type: 'SOLID', color: color, opacity: 0.12 }];
  badge.cornerRadius = 4;
  badge.paddingTop = 3;
  badge.paddingBottom = 3;
  badge.paddingLeft = 8;
  badge.paddingRight = 8;

  var badgeText = figma.createText();
  badgeText.name = "Label";
  badgeText.fontName = { family: "Inter", style: "Medium" };
  badgeText.fontSize = 9;
  badgeText.characters = String(text);
  badgeText.fills = [{ type: 'SOLID', color: color }];

  badge.appendChild(badgeText);
  parent.appendChild(badge);
  return badge;
}

function createFeatureColumn(parent, title, items, badgeType) {
  var column = figma.createFrame();
  column.name = "Features: " + title;
  column.layoutMode = "VERTICAL";
  column.primaryAxisSizingMode = "AUTO";
  column.counterAxisSizingMode = "AUTO";
  column.fills = [];
  column.itemSpacing = 5;

  addBadge(column, title, badgeType);

  var list = Array.isArray(items) && items.length > 0 ? items : ["[Pending]"];
  for (var i = 0; i < list.length; i++) {
    if (!list[i]) continue;
    var itemText = figma.createText();
    itemText.name = "Feature " + (i + 1);
    itemText.fontName = { family: "Inter", style: "Regular" };
    itemText.fontSize = 10;
    itemText.characters = "• " + String(list[i]);
    itemText.fills = [{ type: 'SOLID', color: currentTheme.text }];
    itemText.textAutoResize = "HEIGHT";
    column.appendChild(itemText);
    itemText.layoutSizingHorizontal = "FILL";
  }

  parent.appendChild(column);
  column.layoutSizingHorizontal = "FILL";
  return column;
}

function createMetricColumn(parent, title, items) {
  var column = figma.createFrame();
  column.name = "Metrics: " + title;
  column.layoutMode = "VERTICAL";
  column.primaryAxisSizingMode = "AUTO";
  column.counterAxisSizingMode = "AUTO";
  column.fills = [{ type: 'SOLID', color: currentTheme.bg, opacity: 0.3 }];
  column.cornerRadius = 6;
  column.paddingTop = 8;
  column.paddingBottom = 8;
  column.paddingLeft = 10;
  column.paddingRight = 10;
  column.itemSpacing = 5;

  var titleText = figma.createText();
  titleText.name = "Column Title";
  titleText.fontName = { family: "Inter", style: "Medium" };
  titleText.fontSize = 10;
  titleText.characters = title;
  titleText.fills = [{ type: 'SOLID', color: currentTheme.accent }];
  column.appendChild(titleText);

  var list = Array.isArray(items) && items.length > 0 ? items : ["[Pending]"];
  for (var i = 0; i < list.length; i++) {
    if (!list[i]) continue;
    var itemText = figma.createText();
    itemText.name = "Metric " + (i + 1);
    itemText.fontName = { family: "Inter", style: "Regular" };
    itemText.fontSize = 10;
    itemText.characters = "• " + String(list[i]);
    itemText.fills = [{ type: 'SOLID', color: currentTheme.text }];
    itemText.textAutoResize = "HEIGHT";
    column.appendChild(itemText);
    itemText.layoutSizingHorizontal = "FILL";
  }

  parent.appendChild(column);
  column.layoutSizingHorizontal = "FILL";
  return column;
}

// ============================================
// CARD CREATION
// ============================================

function createSectionCard(parent, title) {
  var card = figma.createFrame();
  card.name = title;
  card.resize(currentLayout.cardWidth, 100);
  card.fills = [{ type: 'SOLID', color: currentTheme.cardBg }];
  card.cornerRadius = 10;
  card.strokeWeight = 1;
  card.strokes = [{ type: 'SOLID', color: currentTheme.line || currentTheme.muted, opacity: 1 }];

  card.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.05 },
    offset: { x: 0, y: 2 },
    radius: 4,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL'
  }];

  card.layoutMode = "VERTICAL";
  card.primaryAxisSizingMode = "AUTO";
  card.counterAxisSizingMode = "FIXED";
  card.paddingTop = 16;
  card.paddingBottom = 16;
  card.paddingLeft = 16;
  card.paddingRight = 16;
  card.itemSpacing = 10;

  parent.appendChild(card);

  // Header with title
  var titleText = figma.createText();
  titleText.name = "Section Title";
  titleText.fontName = { family: "Inter", style: "Bold" };
  titleText.fontSize = 14;
  titleText.characters = title;
  titleText.fills = [{ type: 'SOLID', color: currentTheme.text }];
  card.appendChild(titleText);

  // Add divider below header
  var divider = figma.createRectangle();
  divider.name = "Header Divider";
  divider.resize(100, 1);
  divider.fills = [{ type: 'SOLID', color: currentTheme.line || currentTheme.muted, opacity: 1 }];
  card.appendChild(divider);
  divider.layoutSizingHorizontal = "FILL";

  // For vertical layout, cards should fill width
  // For horizontal layout, keep fixed width to prevent overlap
  if (currentLayout.mode === 'VERTICAL') {
    card.layoutSizingHorizontal = "FILL";
  } else if (currentLayout.mode === 'HORIZONTAL') {
    card.layoutSizingHorizontal = "FIXED";
  }

  return card;
}

// ============================================
// TEXT HELPERS
// ============================================

function addHeading(parent, text, level) {
  var size = level === 2 ? 12 : 11;
  var heading = figma.createText();
  heading.name = "Heading: " + (text || "Heading").replace(/[^\w\s]/g, '').trim();
  heading.fontName = { family: "Inter", style: "Medium" };
  heading.fontSize = size;
  heading.characters = text || "[Heading]";
  heading.fills = [{ type: 'SOLID', color: currentTheme.text }];
  parent.appendChild(heading);
  return heading;
}

function addParagraph(parent, content) {
  if (!content) return null;

  var para = figma.createText();
  para.name = "Paragraph";
  para.fontName = { family: "Inter", style: "Regular" };
  para.fontSize = 11;
  para.characters = String(content);
  para.fills = [{ type: 'SOLID', color: currentTheme.text }];
  para.textAutoResize = "HEIGHT";
  parent.appendChild(para);
  para.layoutSizingHorizontal = "FILL";
  return para;
}

function addBoldLabel(parent, label, value) {
  if (!value) return null;

  var cleanLabel = label.replace(/[^\w\s]/g, '').trim();
  var wrapper = figma.createFrame();
  wrapper.name = "Label: " + cleanLabel;
  wrapper.layoutMode = "HORIZONTAL";
  wrapper.primaryAxisSizingMode = "AUTO";
  wrapper.counterAxisSizingMode = "AUTO";
  wrapper.fills = [];
  wrapper.itemSpacing = 4;

  var labelText = figma.createText();
  labelText.name = cleanLabel + " Label";
  labelText.fontName = { family: "Inter", style: "Medium" };
  labelText.fontSize = 10;
  labelText.characters = label + ": ";
  labelText.fills = [{ type: 'SOLID', color: currentTheme.muted }];

  var valueText = figma.createText();
  valueText.name = cleanLabel + " Value";
  valueText.fontName = { family: "Inter", style: "Regular" };
  valueText.fontSize = 10;
  valueText.characters = String(value);
  valueText.fills = [{ type: 'SOLID', color: currentTheme.text }];

  wrapper.appendChild(labelText);
  wrapper.appendChild(valueText);
  parent.appendChild(wrapper);
  return wrapper;
}

function addCallout(parent, content, icon) {
  if (!content) return null;

  var callout = figma.createFrame();
  callout.name = "Callout";
  callout.layoutMode = "HORIZONTAL";
  callout.primaryAxisSizingMode = "AUTO";
  callout.counterAxisSizingMode = "AUTO";
  callout.fills = [{ type: 'SOLID', color: currentTheme.accent, opacity: 0.08 }];
  callout.cornerRadius = 6;
  callout.paddingTop = 8;
  callout.paddingBottom = 8;
  callout.paddingLeft = 10;
  callout.paddingRight = 10;
  callout.itemSpacing = 8;

  var iconText = figma.createText();
  iconText.name = "Icon";
  iconText.fontName = { family: "Inter", style: "Regular" };
  iconText.fontSize = 11;
  iconText.characters = icon || ">";
  iconText.fills = [{ type: 'SOLID', color: currentTheme.accent }];

  var contentText = figma.createText();
  contentText.name = "Content";
  contentText.fontName = { family: "Inter", style: "Regular" };
  contentText.fontSize = 10;
  contentText.characters = String(content);
  contentText.fills = [{ type: 'SOLID', color: currentTheme.text }];
  contentText.textAutoResize = "HEIGHT";

  callout.appendChild(iconText);
  callout.appendChild(contentText);
  contentText.layoutSizingHorizontal = "FILL";
  parent.appendChild(callout);
  callout.layoutSizingHorizontal = "FILL";
  return callout;
}

function addBulletList(parent, items, listName) {
  var list = Array.isArray(items) && items.length > 0 ? items : ["[Pending]"];

  var wrapper = figma.createFrame();
  wrapper.name = listName || "Bullet List";
  wrapper.layoutMode = "VERTICAL";
  wrapper.primaryAxisSizingMode = "AUTO";
  wrapper.counterAxisSizingMode = "AUTO";
  wrapper.fills = [];
  wrapper.itemSpacing = 5;

  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (!item) continue;

    var row = figma.createFrame();
    row.name = "Item " + (i + 1);
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";
    row.fills = [];
    row.itemSpacing = 6;

    var bullet = figma.createText();
    bullet.name = "Bullet";
    bullet.fontName = { family: "Inter", style: "Regular" };
    bullet.fontSize = 10;
    bullet.characters = "•";
    bullet.fills = [{ type: 'SOLID', color: currentTheme.muted }];

    var text = figma.createText();
    text.name = "Text";
    text.fontName = { family: "Inter", style: "Regular" };
    text.fontSize = 10;
    text.characters = String(item);
    text.fills = [{ type: 'SOLID', color: currentTheme.text }];
    text.textAutoResize = "HEIGHT";

    row.appendChild(bullet);
    row.appendChild(text);
    text.layoutSizingHorizontal = "FILL";
    wrapper.appendChild(row);
    row.layoutSizingHorizontal = "FILL";
  }

  parent.appendChild(wrapper);
  wrapper.layoutSizingHorizontal = "FILL";
  return wrapper;
}

function addNumberedList(parent, items, listName) {
  var list = Array.isArray(items) && items.length > 0 ? items : ["[Pending]"];

  var wrapper = figma.createFrame();
  wrapper.name = listName || "Numbered List";
  wrapper.layoutMode = "VERTICAL";
  wrapper.primaryAxisSizingMode = "AUTO";
  wrapper.counterAxisSizingMode = "AUTO";
  wrapper.fills = [];
  wrapper.itemSpacing = 5;

  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (!item) continue;

    var row = figma.createFrame();
    row.name = "Item " + (i + 1);
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";
    row.fills = [];
    row.itemSpacing = 6;

    var num = figma.createText();
    num.name = "Number";
    num.fontName = { family: "Inter", style: "Medium" };
    num.fontSize = 10;
    num.characters = (i + 1) + ".";
    num.fills = [{ type: 'SOLID', color: currentTheme.accent }];

    var text = figma.createText();
    text.name = "Text";
    text.fontName = { family: "Inter", style: "Regular" };
    text.fontSize = 10;
    text.characters = String(item);
    text.fills = [{ type: 'SOLID', color: currentTheme.text }];
    text.textAutoResize = "HEIGHT";

    row.appendChild(num);
    row.appendChild(text);
    text.layoutSizingHorizontal = "FILL";
    wrapper.appendChild(row);
    row.layoutSizingHorizontal = "FILL";
  }

  parent.appendChild(wrapper);
  wrapper.layoutSizingHorizontal = "FILL";
  return wrapper;
}

function addQuote(parent, content) {
  if (!content) return null;

  var quote = figma.createFrame();
  quote.name = "Quote";
  quote.layoutMode = "HORIZONTAL";
  quote.primaryAxisSizingMode = "AUTO";
  quote.counterAxisSizingMode = "AUTO";
  quote.fills = [];
  quote.itemSpacing = 8;

  var border = figma.createRectangle();
  border.name = "Border";
  border.resize(2, 16);
  border.fills = [{ type: 'SOLID', color: currentTheme.accent }];
  border.cornerRadius = 1;

  var text = figma.createText();
  text.name = "Quote Text";
  text.fontName = { family: "Inter", style: "Regular" };
  text.fontSize = 10;
  text.characters = '"' + String(content) + '"';
  text.fills = [{ type: 'SOLID', color: currentTheme.muted }];
  text.textAutoResize = "HEIGHT";

  quote.appendChild(border);
  quote.appendChild(text);
  text.layoutSizingHorizontal = "FILL";
  parent.appendChild(quote);
  quote.layoutSizingHorizontal = "FILL";
  return quote;
}

function addDivider(parent) {
  var divider = figma.createRectangle();
  divider.name = "Divider";
  divider.resize(100, 1);
  divider.fills = [{ type: 'SOLID', color: currentTheme.line || currentTheme.muted, opacity: 1 }];
  parent.appendChild(divider);
  divider.layoutSizingHorizontal = "FILL";
}

// ============================================
// SECTION GENERATORS
// ============================================

function generateProjectOverview(parent, data) {
  var card = createSectionCard(parent, "01. Project Overview");

  // Description box with accent background
  var descBox = createColoredSection(card, "📋 DESCRIPTION", currentTheme.accent);
  addSectionText(descBox, data.description);

  // Target Audience box
  var audienceBox = createColoredSection(card, "👥 TARGET AUDIENCE", currentTheme.warning);
  if (data.target_audience) {
    if (typeof data.target_audience === 'object') {
      addSectionText(audienceBox, data.target_audience.primary || "[Pending]");
      if (data.target_audience.secondary) {
        var secondaryText = figma.createText();
        secondaryText.fontName = { family: "Inter", style: "Regular" };
        secondaryText.fontSize = 10;
        secondaryText.characters = "Secondary: " + data.target_audience.secondary;
        secondaryText.fills = [{ type: 'SOLID', color: currentTheme.muted }];
        secondaryText.textAutoResize = "HEIGHT";
        audienceBox.appendChild(secondaryText);
        secondaryText.layoutSizingHorizontal = "FILL";
      }
    } else {
      addSectionText(audienceBox, data.target_audience);
    }
  }

  // Objectives box with success color
  var objectivesBox = createColoredSection(card, "🎯 OBJECTIVES", currentTheme.success);
  var objList = Array.isArray(data.objectives) ? data.objectives : ["[Pending]"];
  for (var i = 0; i < objList.length; i++) {
    var objText = figma.createText();
    objText.fontName = { family: "Inter", style: "Regular" };
    objText.fontSize = 10;
    objText.characters = (i + 1) + ". " + String(objList[i] || "");
    objText.fills = [{ type: 'SOLID', color: currentTheme.text }];
    objText.textAutoResize = "HEIGHT";
    objectivesBox.appendChild(objText);
    objText.layoutSizingHorizontal = "FILL";
  }

  // Motivation box with warning/attention color
  var motivationBox = createColoredSection(card, "💡 MOTIVATION", currentTheme.error);
  addSectionText(motivationBox, data.motivation);
}

// Helper: Create colored section like Empathy Map cells
function createColoredSection(parent, label, accentColor) {
  var section = figma.createFrame();
  section.name = label;
  section.layoutMode = "VERTICAL";
  section.primaryAxisSizingMode = "AUTO";
  section.counterAxisSizingMode = "AUTO";
  section.fills = [{ type: 'SOLID', color: accentColor, opacity: 0.1 }];
  section.cornerRadius = 8;
  section.paddingTop = 12;
  section.paddingBottom = 12;
  section.paddingLeft = 14;
  section.paddingRight = 14;
  section.itemSpacing = 8;

  var header = figma.createText();
  header.fontName = { family: "Inter", style: "Bold" };
  header.fontSize = 10;
  header.characters = label;
  header.fills = [{ type: 'SOLID', color: accentColor }];
  section.appendChild(header);

  parent.appendChild(section);
  section.layoutSizingHorizontal = "FILL";
  return section;
}

// Helper: Add text to colored section
function addSectionText(parent, content) {
  if (!content) return;
  var text = figma.createText();
  text.fontName = { family: "Inter", style: "Regular" };
  text.fontSize = 10;
  text.characters = String(content);
  text.fills = [{ type: 'SOLID', color: currentTheme.text }];
  text.textAutoResize = "HEIGHT";
  parent.appendChild(text);
  text.layoutSizingHorizontal = "FILL";
  return text;
}

function generateOutlineScope(parent, data) {
  var card = createSectionCard(parent, "02. Outline & Scope");

  // Problem Statement - prominent error/warning color
  var problemBox = createColoredSection(card, "⚠️ PROBLEM STATEMENT", currentTheme.error);
  addSectionText(problemBox, data.problem_statement);

  // 2x2 Grid: Assumptions | Constraints
  var topGrid = figma.createFrame();
  topGrid.name = "Top Grid";
  topGrid.layoutMode = "HORIZONTAL";
  topGrid.primaryAxisSizingMode = "AUTO";
  topGrid.counterAxisSizingMode = "AUTO";
  topGrid.fills = [];
  topGrid.itemSpacing = 10;
  card.appendChild(topGrid);
  topGrid.layoutSizingHorizontal = "FILL";

  var assumptionsBox = createColoredSection(topGrid, "📝 ASSUMPTIONS", currentTheme.warning);
  addSectionBullets(assumptionsBox, data.assumptions);

  var constraintsBox = createColoredSection(topGrid, "🔒 CONSTRAINTS", currentTheme.muted);
  addSectionBullets(constraintsBox, data.constraints);

  // Features Grid (3 columns)
  if (data.features) {
    var featuresGrid = figma.createFrame();
    featuresGrid.name = "Features Grid";
    featuresGrid.layoutMode = "HORIZONTAL";
    featuresGrid.primaryAxisSizingMode = "AUTO";
    featuresGrid.counterAxisSizingMode = "AUTO";
    featuresGrid.fills = [];
    featuresGrid.itemSpacing = 10;
    card.appendChild(featuresGrid);
    featuresGrid.layoutSizingHorizontal = "FILL";

    var mustHaveBox = createColoredSection(featuresGrid, "✅ MUST HAVE", currentTheme.success);
    addSectionBullets(mustHaveBox, data.features.must_have);

    var niceBox = createColoredSection(featuresGrid, "💫 NICE TO HAVE", currentTheme.warning);
    addSectionBullets(niceBox, data.features.nice_to_have);

    var outBox = createColoredSection(featuresGrid, "🚫 OUT OF SCOPE", currentTheme.muted);
    addSectionBullets(outBox, data.features.out_of_scope);
  }

  // Metrics Grid (2 columns)
  if (data.success_metrics) {
    var metricsGrid = figma.createFrame();
    metricsGrid.name = "Metrics Grid";
    metricsGrid.layoutMode = "HORIZONTAL";
    metricsGrid.primaryAxisSizingMode = "AUTO";
    metricsGrid.counterAxisSizingMode = "AUTO";
    metricsGrid.fills = [];
    metricsGrid.itemSpacing = 10;
    card.appendChild(metricsGrid);
    metricsGrid.layoutSizingHorizontal = "FILL";

    var behavioralBox = createColoredSection(metricsGrid, "📊 BEHAVIORAL", currentTheme.accent);
    addSectionBullets(behavioralBox, data.success_metrics.behavioral);

    var engagementBox = createColoredSection(metricsGrid, "📈 ENGAGEMENT", currentTheme.success);
    addSectionBullets(engagementBox, data.success_metrics.engagement);
  }
}

// Helper: Add bullet list to colored section
function addSectionBullets(parent, items) {
  var list = Array.isArray(items) && items.length > 0 ? items : ["[Pending]"];
  for (var i = 0; i < list.length; i++) {
    if (!list[i]) continue;
    var itemText = figma.createText();
    itemText.fontName = { family: "Inter", style: "Regular" };
    itemText.fontSize = 10;
    itemText.characters = "• " + String(list[i]);
    itemText.fills = [{ type: 'SOLID', color: currentTheme.text }];
    itemText.textAutoResize = "HEIGHT";
    parent.appendChild(itemText);
    itemText.layoutSizingHorizontal = "FILL";
  }
}

function generateUserResearch(parent, data) {
  var card = createSectionCard(parent, "03. User Research");

  // Top row: Questions | Methods
  var topGrid = figma.createFrame();
  topGrid.name = "Top Grid";
  topGrid.layoutMode = "HORIZONTAL";
  topGrid.primaryAxisSizingMode = "AUTO";
  topGrid.counterAxisSizingMode = "AUTO";
  topGrid.fills = [];
  topGrid.itemSpacing = 10;
  card.appendChild(topGrid);
  topGrid.layoutSizingHorizontal = "FILL";

  var questionsBox = createColoredSection(topGrid, "❓ RESEARCH QUESTIONS", currentTheme.accent);
  addSectionNumbered(questionsBox, data.research_questions);

  var methodsBox = createColoredSection(topGrid, "🔬 METHODS", currentTheme.muted);
  addSectionBullets(methodsBox, data.research_methods);

  // Key Findings - prominent
  var findingsBox = createColoredSection(card, "🔍 KEY FINDINGS", currentTheme.success);
  addSectionBullets(findingsBox, data.key_findings);

  // Middle row: User Needs (3 types) | Frustrations
  var midGrid = figma.createFrame();
  midGrid.name = "Mid Grid";
  midGrid.layoutMode = "HORIZONTAL";
  midGrid.primaryAxisSizingMode = "AUTO";
  midGrid.counterAxisSizingMode = "AUTO";
  midGrid.fills = [];
  midGrid.itemSpacing = 10;
  card.appendChild(midGrid);
  midGrid.layoutSizingHorizontal = "FILL";

  var needsBox = createColoredSection(midGrid, "💭 USER NEEDS", currentTheme.warning);
  if (data.user_needs && typeof data.user_needs === 'object' && !Array.isArray(data.user_needs)) {
    addSectionLabeledItem(needsBox, "Functional", data.user_needs.functional);
    addSectionLabeledItem(needsBox, "Emotional", data.user_needs.emotional);
    addSectionLabeledItem(needsBox, "Social", data.user_needs.social);
  } else {
    addSectionBullets(needsBox, data.user_needs);
  }

  var frustBox = createColoredSection(midGrid, "😤 FRUSTRATIONS", currentTheme.error);
  addSectionBullets(frustBox, data.frustrations_detected);

  // User Quotes at bottom
  if (Array.isArray(data.user_quotes) && data.user_quotes.length > 0) {
    var quotesBox = createColoredSection(card, "💬 USER QUOTES", currentTheme.accent);
    for (var i = 0; i < Math.min(data.user_quotes.length, 3); i++) {
      var quoteText = figma.createText();
      quoteText.fontName = { family: "Inter", style: "Regular" };
      quoteText.fontSize = 10;
      quoteText.characters = '"' + String(data.user_quotes[i]) + '"';
      quoteText.fills = [{ type: 'SOLID', color: currentTheme.muted }];
      quoteText.textAutoResize = "HEIGHT";
      quotesBox.appendChild(quoteText);
      quoteText.layoutSizingHorizontal = "FILL";
    }
  }
}

// Helper: Add numbered list to section
function addSectionNumbered(parent, items) {
  var list = Array.isArray(items) && items.length > 0 ? items : ["[Pending]"];
  for (var i = 0; i < list.length; i++) {
    if (!list[i]) continue;
    var itemText = figma.createText();
    itemText.fontName = { family: "Inter", style: "Regular" };
    itemText.fontSize = 10;
    itemText.characters = (i + 1) + ". " + String(list[i]);
    itemText.fills = [{ type: 'SOLID', color: currentTheme.text }];
    itemText.textAutoResize = "HEIGHT";
    parent.appendChild(itemText);
    itemText.layoutSizingHorizontal = "FILL";
  }
}

// Helper: Add labeled item (Label: Value)
function addSectionLabeledItem(parent, label, value) {
  var row = figma.createFrame();
  row.name = label;
  row.layoutMode = "HORIZONTAL";
  row.primaryAxisSizingMode = "AUTO";
  row.counterAxisSizingMode = "AUTO";
  row.fills = [];
  row.itemSpacing = 4;

  var labelText = figma.createText();
  labelText.fontName = { family: "Inter", style: "Medium" };
  labelText.fontSize = 10;
  labelText.characters = label + ":";
  labelText.fills = [{ type: 'SOLID', color: currentTheme.muted }];
  row.appendChild(labelText);

  var valueText = figma.createText();
  valueText.fontName = { family: "Inter", style: "Regular" };
  valueText.fontSize = 10;
  valueText.characters = String(value || "[Pending]");
  valueText.fills = [{ type: 'SOLID', color: currentTheme.text }];
  valueText.textAutoResize = "HEIGHT";
  row.appendChild(valueText);
  valueText.layoutSizingHorizontal = "FILL";

  parent.appendChild(row);
  row.layoutSizingHorizontal = "FILL";
}

function generateUserPersona(parent, data) {
  var card = createSectionCard(parent, "04. Persona: " + (data.name || "User"));

  // Header with name, age, location in accent box
  var headerInfo = (data.age_occupation || "[Age/Occupation]") + (data.location ? " — " + data.location : "");
  var headerBox = createColoredSection(card, "👤 " + (data.name || "User").toUpperCase(), currentTheme.accent);
  addSectionText(headerBox, headerInfo);

  // BIO section with warm background (special color)
  var bioBox = figma.createFrame();
  bioBox.name = "BIO";
  bioBox.layoutMode = "VERTICAL";
  bioBox.primaryAxisSizingMode = "AUTO";
  bioBox.counterAxisSizingMode = "AUTO";
  bioBox.fills = [{ type: 'SOLID', color: { r: 0.996, g: 0.949, b: 0.878 } }];
  bioBox.cornerRadius = 8;
  bioBox.paddingTop = 12;
  bioBox.paddingBottom = 12;
  bioBox.paddingLeft = 14;
  bioBox.paddingRight = 14;
  bioBox.itemSpacing = 8;

  var bioHeader = figma.createText();
  bioHeader.fontName = { family: "Inter", style: "Bold" };
  bioHeader.fontSize = 10;
  bioHeader.characters = "📖 BIO";
  bioHeader.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.4, b: 0.2 } }];
  bioBox.appendChild(bioHeader);

  var bioText = figma.createText();
  bioText.fontName = { family: "Inter", style: "Regular" };
  bioText.fontSize = 10;
  bioText.characters = String(data.bio || "[Pending]");
  bioText.fills = [{ type: 'SOLID', color: currentTheme.text }];
  bioText.textAutoResize = "HEIGHT";
  bioBox.appendChild(bioText);
  bioText.layoutSizingHorizontal = "FILL";

  card.appendChild(bioBox);
  bioBox.layoutSizingHorizontal = "FILL";

  // Technology & Routine row
  var topGrid = figma.createFrame();
  topGrid.name = "Top Grid";
  topGrid.layoutMode = "HORIZONTAL";
  topGrid.primaryAxisSizingMode = "AUTO";
  topGrid.counterAxisSizingMode = "AUTO";
  topGrid.fills = [];
  topGrid.itemSpacing = 10;
  card.appendChild(topGrid);
  topGrid.layoutSizingHorizontal = "FILL";

  var techBox = createColoredSection(topGrid, "💻 TECHNOLOGY", currentTheme.accent);
  if (data.technology && typeof data.technology === 'object' && !Array.isArray(data.technology)) {
    addSectionLabeledItem(techBox, "Device", data.technology.primary_device);
    addSectionLabeledItem(techBox, "Apps", data.technology.key_apps);
    addSectionLabeledItem(techBox, "Comfort", data.technology.tech_comfort);
  } else {
    addSectionBullets(techBox, data.technology);
  }

  var routineBox = createColoredSection(topGrid, "📅 DAILY ROUTINE", currentTheme.warning);
  if (data.routine && typeof data.routine === 'object') {
    addSectionLabeledItem(routineBox, "Morning", data.routine.morning);
    addSectionLabeledItem(routineBox, "Workday", data.routine.workday);
    addSectionLabeledItem(routineBox, "Evening", data.routine.evening);
  }

  // Objectives & Motivations row
  var midGrid = figma.createFrame();
  midGrid.name = "Mid Grid";
  midGrid.layoutMode = "HORIZONTAL";
  midGrid.primaryAxisSizingMode = "AUTO";
  midGrid.counterAxisSizingMode = "AUTO";
  midGrid.fills = [];
  midGrid.itemSpacing = 10;
  card.appendChild(midGrid);
  midGrid.layoutSizingHorizontal = "FILL";

  var objBox = createColoredSection(midGrid, "🎯 OBJECTIVES", currentTheme.success);
  addSectionNumbered(objBox, data.user_objectives);

  var motBox = createColoredSection(midGrid, "🔥 MOTIVATIONS", currentTheme.warning);
  addSectionBullets(motBox, data.main_motivations);

  // Frustrations - full width, error color
  var frustBox = createColoredSection(card, "😤 FRUSTRATIONS", currentTheme.error);
  addSectionBullets(frustBox, data.frustrations);
}

function createPersonaCell(parent, title, items, numbered) {
  var cell = figma.createFrame();
  cell.name = title;
  cell.layoutMode = "VERTICAL";
  cell.primaryAxisSizingMode = "AUTO";
  cell.counterAxisSizingMode = "AUTO";
  cell.fills = [{ type: 'SOLID', color: currentTheme.bg, opacity: 0.6 }];
  cell.cornerRadius = 8;
  cell.paddingTop = 12;
  cell.paddingBottom = 12;
  cell.paddingLeft = 12;
  cell.paddingRight = 12;
  cell.itemSpacing = 6;

  var titleText = figma.createText();
  titleText.fontName = { family: "Inter", style: "Bold" };
  titleText.fontSize = 11;
  titleText.characters = title;
  titleText.fills = [{ type: 'SOLID', color: currentTheme.text }];
  cell.appendChild(titleText);

  var list = Array.isArray(items) && items.length > 0 ? items : ["[Pending]"];
  for (var i = 0; i < list.length; i++) {
    if (!list[i]) continue;
    var itemText = figma.createText();
    itemText.fontName = { family: "Inter", style: "Regular" };
    itemText.fontSize = 10;
    itemText.characters = (numbered ? (i + 1) + ". " : "• ") + String(list[i]);
    itemText.fills = [{ type: 'SOLID', color: currentTheme.text }];
    itemText.textAutoResize = "HEIGHT";
    cell.appendChild(itemText);
    itemText.layoutSizingHorizontal = "FILL";
  }

  parent.appendChild(cell);
  cell.layoutSizingHorizontal = "FILL";
  return cell;
}

function generateEmpathyMap(parent, data) {
  var card = createSectionCard(parent, "05. Empathy Map");

  createGrid2x2(card,
    [data.thinks, data.feels, data.says, data.does],
    ["🧠 THINKS", "❤️ FEELS", "💬 SAYS", "🖐️ DOES"]
  );

  addDivider(card);

  var painsGainsRow = createRow(card, 2, 12, "Pains & Gains");

  var painsCol = figma.createFrame();
  painsCol.name = "Pains";
  painsCol.layoutMode = "VERTICAL";
  painsCol.primaryAxisSizingMode = "AUTO";
  painsCol.counterAxisSizingMode = "AUTO";
  painsCol.fills = [{ type: 'SOLID', color: currentTheme.error, opacity: 0.1 }];
  painsCol.cornerRadius = 8;
  painsCol.paddingTop = 12;
  painsCol.paddingBottom = 12;
  painsCol.paddingLeft = 14;
  painsCol.paddingRight = 14;
  painsCol.itemSpacing = 6;

  var painsHeader = figma.createText();
  painsHeader.name = "Header";
  painsHeader.fontName = { family: "Inter", style: "Bold" };
  painsHeader.fontSize = 11;
  painsHeader.characters = "PAINS";
  painsHeader.fills = [{ type: 'SOLID', color: currentTheme.error }];
  painsCol.appendChild(painsHeader);

  var painsText = figma.createText();
  painsText.name = "Content";
  painsText.fontName = { family: "Inter", style: "Regular" };
  painsText.fontSize = 10;
  painsText.characters = String(data.pains || "[Pending]");
  painsText.fills = [{ type: 'SOLID', color: currentTheme.text }];
  painsText.textAutoResize = "HEIGHT";
  painsCol.appendChild(painsText);
  painsText.layoutSizingHorizontal = "FILL";

  painsGainsRow.appendChild(painsCol);
  painsCol.layoutSizingHorizontal = "FILL";

  var gainsCol = figma.createFrame();
  gainsCol.name = "Gains";
  gainsCol.layoutMode = "VERTICAL";
  gainsCol.primaryAxisSizingMode = "AUTO";
  gainsCol.counterAxisSizingMode = "AUTO";
  gainsCol.fills = [{ type: 'SOLID', color: currentTheme.success, opacity: 0.1 }];
  gainsCol.cornerRadius = 8;
  gainsCol.paddingTop = 12;
  gainsCol.paddingBottom = 12;
  gainsCol.paddingLeft = 14;
  gainsCol.paddingRight = 14;
  gainsCol.itemSpacing = 6;

  var gainsHeader = figma.createText();
  gainsHeader.name = "Header";
  gainsHeader.fontName = { family: "Inter", style: "Bold" };
  gainsHeader.fontSize = 11;
  gainsHeader.characters = "GAINS";
  gainsHeader.fills = [{ type: 'SOLID', color: currentTheme.success }];
  gainsCol.appendChild(gainsHeader);

  var gainsText = figma.createText();
  gainsText.name = "Content";
  gainsText.fontName = { family: "Inter", style: "Regular" };
  gainsText.fontSize = 10;
  gainsText.characters = String(data.gains || "[Pending]");
  gainsText.fills = [{ type: 'SOLID', color: currentTheme.text }];
  gainsText.textAutoResize = "HEIGHT";
  gainsCol.appendChild(gainsText);
  gainsText.layoutSizingHorizontal = "FILL";

  painsGainsRow.appendChild(gainsCol);
  gainsCol.layoutSizingHorizontal = "FILL";
}

function generateJourneyMap(parent, data) {
  if (!Array.isArray(data)) return;

  var card = createSectionCard(parent, "06. User Journey Map");

  // Stage colors cycle through theme colors
  var stageColors = [currentTheme.accent, currentTheme.warning, currentTheme.success];

  var stagesContainer = figma.createFrame();
  stagesContainer.name = "Stages";
  stagesContainer.layoutMode = "HORIZONTAL";
  stagesContainer.primaryAxisSizingMode = "AUTO";
  stagesContainer.counterAxisSizingMode = "AUTO";
  stagesContainer.fills = [];
  stagesContainer.itemSpacing = 12;
  stagesContainer.layoutWrap = "NO_WRAP";

  for (var i = 0; i < data.length; i++) {
    var stage = data[i];
    var stageColor = stageColors[i % stageColors.length];

    // Main stage card with colored border
    var stageCol = figma.createFrame();
    stageCol.name = "Stage " + (i + 1);
    stageCol.layoutMode = "VERTICAL";
    stageCol.primaryAxisSizingMode = "AUTO";
    stageCol.counterAxisSizingMode = "FIXED";
    stageCol.resize(180, 100);
    stageCol.fills = [{ type: 'SOLID', color: stageColor, opacity: 0.08 }];
    stageCol.cornerRadius = 10;
    stageCol.strokeWeight = 2;
    stageCol.strokes = [{ type: 'SOLID', color: stageColor, opacity: 0.3 }];
    stageCol.paddingTop = 14;
    stageCol.paddingBottom = 14;
    stageCol.paddingLeft = 14;
    stageCol.paddingRight = 14;
    stageCol.itemSpacing = 10;

    // Stage header with number and name
    var stageHeader = figma.createFrame();
    stageHeader.layoutMode = "VERTICAL";
    stageHeader.primaryAxisSizingMode = "AUTO";
    stageHeader.counterAxisSizingMode = "AUTO";
    stageHeader.fills = [{ type: 'SOLID', color: stageColor, opacity: 0.15 }];
    stageHeader.cornerRadius = 6;
    stageHeader.paddingTop = 8;
    stageHeader.paddingBottom = 8;
    stageHeader.paddingLeft = 10;
    stageHeader.paddingRight = 10;
    stageHeader.itemSpacing = 2;

    var stageNum = figma.createText();
    stageNum.fontName = { family: "Inter", style: "Bold" };
    stageNum.fontSize = 9;
    stageNum.characters = "STAGE " + (i + 1);
    stageNum.fills = [{ type: 'SOLID', color: stageColor }];
    stageHeader.appendChild(stageNum);

    var stageName = figma.createText();
    stageName.fontName = { family: "Inter", style: "Bold" };
    stageName.fontSize = 12;
    stageName.characters = stage.stage || "[Stage]";
    stageName.fills = [{ type: 'SOLID', color: currentTheme.text }];
    stageHeader.appendChild(stageName);

    var timeline = figma.createText();
    timeline.fontName = { family: "Inter", style: "Regular" };
    timeline.fontSize = 9;
    timeline.characters = "📅 " + (stage.timeline || "Day X");
    timeline.fills = [{ type: 'SOLID', color: currentTheme.muted }];
    stageHeader.appendChild(timeline);

    stageCol.appendChild(stageHeader);
    stageHeader.layoutSizingHorizontal = "FILL";

    // Actions section
    if (Array.isArray(stage.actions) && stage.actions.length > 0) {
      var actionsBox = createMiniSection(stageCol, "🖐️ ACTIONS", currentTheme.muted);
      for (var a = 0; a < Math.min(stage.actions.length, 3); a++) {
        addMiniText(actionsBox, "• " + (stage.actions[a] || ""));
      }
    }

    // Feelings section
    if (stage.feelings) {
      var feelingsBox = createMiniSection(stageCol, "❤️ FEELINGS", currentTheme.warning);
      var feelingsContent = typeof stage.feelings === 'object'
        ? (stage.feelings.start || "") + " → " + (stage.feelings.end || "")
        : String(stage.feelings);
      addMiniText(feelingsBox, feelingsContent);
    }

    // Thoughts section
    if (Array.isArray(stage.thoughts) && stage.thoughts.length > 0) {
      var thoughtsBox = createMiniSection(stageCol, "💭 THOUGHTS", currentTheme.accent);
      for (var t = 0; t < Math.min(stage.thoughts.length, 2); t++) {
        addMiniText(thoughtsBox, "• " + (stage.thoughts[t] || ""));
      }
    }

    // Pain Points section
    if (Array.isArray(stage.pain_points) && stage.pain_points.length > 0) {
      var painBox = createMiniSection(stageCol, "😤 PAINS", currentTheme.error);
      for (var p = 0; p < Math.min(stage.pain_points.length, 2); p++) {
        addMiniText(painBox, "• " + (stage.pain_points[p] || ""));
      }
    }

    // Opportunities section
    if (Array.isArray(stage.opportunities) && stage.opportunities.length > 0) {
      var oppBox = createMiniSection(stageCol, "💡 OPPORTUNITIES", currentTheme.success);
      for (var o = 0; o < Math.min(stage.opportunities.length, 2); o++) {
        addMiniText(oppBox, "• " + (stage.opportunities[o] || ""));
      }
    }

    stagesContainer.appendChild(stageCol);
  }

  card.appendChild(stagesContainer);
}

// Helper: Create mini section inside journey stage
function createMiniSection(parent, label, color) {
  var section = figma.createFrame();
  section.name = label;
  section.layoutMode = "VERTICAL";
  section.primaryAxisSizingMode = "AUTO";
  section.counterAxisSizingMode = "AUTO";
  section.fills = [{ type: 'SOLID', color: color, opacity: 0.1 }];
  section.cornerRadius = 6;
  section.paddingTop = 6;
  section.paddingBottom = 6;
  section.paddingLeft = 8;
  section.paddingRight = 8;
  section.itemSpacing = 3;

  var header = figma.createText();
  header.fontName = { family: "Inter", style: "Bold" };
  header.fontSize = 8;
  header.characters = label;
  header.fills = [{ type: 'SOLID', color: color }];
  section.appendChild(header);

  parent.appendChild(section);
  section.layoutSizingHorizontal = "FILL";
  return section;
}

// Helper: Add mini text to section
function addMiniText(parent, content) {
  var text = figma.createText();
  text.fontName = { family: "Inter", style: "Regular" };
  text.fontSize = 9;
  text.characters = String(content);
  text.fills = [{ type: 'SOLID', color: currentTheme.text }];
  text.textAutoResize = "HEIGHT";
  parent.appendChild(text);
  text.layoutSizingHorizontal = "FILL";
}

function generateResearchSynthesis(parent, data) {
  var card = createSectionCard(parent, "07. Research Synthesis");

  // Key Insights as horizontal cards
  if (Array.isArray(data.key_insights) && data.key_insights.length > 0) {
    var insightsGrid = figma.createFrame();
    insightsGrid.name = "Insights Grid";
    insightsGrid.layoutMode = "HORIZONTAL";
    insightsGrid.primaryAxisSizingMode = "AUTO";
    insightsGrid.counterAxisSizingMode = "AUTO";
    insightsGrid.fills = [];
    insightsGrid.itemSpacing = 10;
    card.appendChild(insightsGrid);
    insightsGrid.layoutSizingHorizontal = "FILL";

    var insightColors = [currentTheme.accent, currentTheme.warning, currentTheme.success];

    for (var i = 0; i < data.key_insights.length; i++) {
      var insight = data.key_insights[i];
      var insightColor = insightColors[i % insightColors.length];

      var insightBox = figma.createFrame();
      insightBox.name = "Insight " + (i + 1);
      insightBox.layoutMode = "VERTICAL";
      insightBox.primaryAxisSizingMode = "AUTO";
      insightBox.counterAxisSizingMode = "AUTO";
      insightBox.fills = [{ type: 'SOLID', color: insightColor, opacity: 0.1 }];
      insightBox.cornerRadius = 10;
      insightBox.strokeWeight = 2;
      insightBox.strokes = [{ type: 'SOLID', color: insightColor, opacity: 0.3 }];
      insightBox.paddingTop = 14;
      insightBox.paddingBottom = 14;
      insightBox.paddingLeft = 14;
      insightBox.paddingRight = 14;
      insightBox.itemSpacing = 8;

      var insightTitle = figma.createText();
      insightTitle.fontName = { family: "Inter", style: "Bold" };
      insightTitle.fontSize = 11;
      insightTitle.characters = insight.title || "[Insight]";
      insightTitle.fills = [{ type: 'SOLID', color: insightColor }];
      insightBox.appendChild(insightTitle);

      if (insight.evidence) {
        var evidenceBox = createMiniSection(insightBox, "📊 EVIDENCE", currentTheme.muted);
        addMiniText(evidenceBox, insight.evidence);
      }

      if (insight.implication) {
        var impBox = createMiniSection(insightBox, "→ IMPLICATION", currentTheme.success);
        addMiniText(impBox, insight.implication);
      }

      insightsGrid.appendChild(insightBox);
      insightBox.layoutSizingHorizontal = "FILL";
    }
  }

  // How Might We - 2 column grid
  if (data.how_might_we) {
    var hmwGrid = figma.createFrame();
    hmwGrid.name = "HMW Grid";
    hmwGrid.layoutMode = "HORIZONTAL";
    hmwGrid.primaryAxisSizingMode = "AUTO";
    hmwGrid.counterAxisSizingMode = "AUTO";
    hmwGrid.fills = [];
    hmwGrid.itemSpacing = 10;
    card.appendChild(hmwGrid);
    hmwGrid.layoutSizingHorizontal = "FILL";

    if (Array.isArray(data.how_might_we)) {
      var hmwBox = createColoredSection(hmwGrid, "❓ HOW MIGHT WE", currentTheme.accent);
      addSectionBullets(hmwBox, data.how_might_we);
    } else {
      var primaryBox = createColoredSection(hmwGrid, "❓ PRIMARY HMW", currentTheme.accent);
      addSectionBullets(primaryBox, data.how_might_we.primary);

      var secondaryBox = createColoredSection(hmwGrid, "💭 SECONDARY HMW", currentTheme.muted);
      addSectionBullets(secondaryBox, data.how_might_we.secondary);
    }
  }

  // Design Principles as cards
  if (Array.isArray(data.design_principles) && data.design_principles.length > 0) {
    var principlesGrid = figma.createFrame();
    principlesGrid.name = "Principles Grid";
    principlesGrid.layoutMode = "HORIZONTAL";
    principlesGrid.primaryAxisSizingMode = "AUTO";
    principlesGrid.counterAxisSizingMode = "AUTO";
    principlesGrid.fills = [];
    principlesGrid.itemSpacing = 10;
    card.appendChild(principlesGrid);
    principlesGrid.layoutSizingHorizontal = "FILL";

    for (var j = 0; j < data.design_principles.length; j++) {
      var p = data.design_principles[j];

      var principleBox = figma.createFrame();
      principleBox.name = "Principle " + (j + 1);
      principleBox.layoutMode = "VERTICAL";
      principleBox.primaryAxisSizingMode = "AUTO";
      principleBox.counterAxisSizingMode = "AUTO";
      principleBox.fills = [{ type: 'SOLID', color: currentTheme.accent, opacity: 0.08 }];
      principleBox.cornerRadius = 10;
      principleBox.strokeWeight = 1;
      principleBox.strokes = [{ type: 'SOLID', color: currentTheme.accent, opacity: 0.2 }];
      principleBox.paddingTop = 14;
      principleBox.paddingBottom = 14;
      principleBox.paddingLeft = 14;
      principleBox.paddingRight = 14;
      principleBox.itemSpacing = 6;

      var principleTitle = figma.createText();
      principleTitle.fontName = { family: "Inter", style: "Bold" };
      principleTitle.fontSize = 11;
      principleTitle.characters = "# " + (p.name || "[Principle]");
      principleTitle.fills = [{ type: 'SOLID', color: currentTheme.accent }];
      principleBox.appendChild(principleTitle);

      addSectionLabeledItem(principleBox, "Definition", p.definition);
      addSectionLabeledItem(principleBox, "Rationale", p.rationale);
      addSectionLabeledItem(principleBox, "Application", p.application);

      principlesGrid.appendChild(principleBox);
      principleBox.layoutSizingHorizontal = "FILL";
    }
  }
}

// ============================================
// SEPARATE CARD GENERATORS
// Creates standalone frames for canvas placement
// ============================================

function createStandaloneCard(title) {
  var card = figma.createFrame();
  card.name = title;
  card.resize(currentLayout.cardWidth, 100);
  card.fills = [{ type: 'SOLID', color: currentTheme.cardBg }];
  card.cornerRadius = 12;
  card.strokeWeight = 1;
  card.strokes = [{ type: 'SOLID', color: currentTheme.line || currentTheme.muted, opacity: 1 }];
  card.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.08 },
    offset: { x: 0, y: 4 },
    radius: 12,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL'
  }];
  card.layoutMode = "VERTICAL";
  card.primaryAxisSizingMode = "AUTO";
  card.counterAxisSizingMode = "FIXED";
  card.paddingTop = 20;
  card.paddingBottom = 20;
  card.paddingLeft = 20;
  card.paddingRight = 20;
  card.itemSpacing = 12;

  // Header with title
  var titleText = figma.createText();
  titleText.name = "Section Title";
  titleText.fontName = { family: "Inter", style: "Bold" };
  titleText.fontSize = 16;
  titleText.characters = title;
  titleText.fills = [{ type: 'SOLID', color: currentTheme.text }];
  card.appendChild(titleText);

  // Add divider below header
  var divider = figma.createRectangle();
  divider.name = "Header Divider";
  divider.resize(100, 1);
  divider.fills = [{ type: 'SOLID', color: currentTheme.line || currentTheme.muted, opacity: 1 }];
  card.appendChild(divider);
  divider.layoutSizingHorizontal = "FILL";

  return card;
}

function generateProjectOverviewSeparate(data, projectName) {
  var card = createStandaloneCard("01. Project Overview");
  addHeading(card, "📋 Description", 3);
  addParagraph(card, data.description);
  if (data.target_audience) {
    addHeading(card, "→ Target Audience", 3);
    if (typeof data.target_audience === 'object') {
      addCallout(card, data.target_audience.primary || "[Pending]", ">");
      if (data.target_audience.secondary) {
        addBoldLabel(card, "Secondary", data.target_audience.secondary);
      }
    } else {
      addCallout(card, data.target_audience, ">");
    }
  }
  addHeading(card, "🎯 Objectives", 3);
  addNumberedList(card, data.objectives);
  addHeading(card, "! Motivation", 3);
  addCallout(card, data.motivation, "!");
  return card;
}

function generateOutlineScopeSeparate(data, projectName) {
  var card = createStandaloneCard("02. Outline & Scope");
  addHeading(card, "⚠️ Problem Statement", 3);
  addCallout(card, data.problem_statement, "!");
  addHeading(card, "📝 Assumptions", 3);
  addBulletList(card, data.assumptions);
  addHeading(card, "🔒 Constraints", 3);
  addBulletList(card, data.constraints);
  if (data.features) {
    addHeading(card, "✨ Features", 3);
    var featuresRow = createRow(card, 3, 8, "Features Grid");
    createFeatureColumn(featuresRow, "Must Have", data.features.must_have, "success");
    createFeatureColumn(featuresRow, "Nice to Have", data.features.nice_to_have, "warning");
    createFeatureColumn(featuresRow, "Out of Scope", data.features.out_of_scope, "muted");
  }
  if (data.success_metrics) {
    addHeading(card, "📊 Success Metrics", 3);
    var metricsRow = createRow(card, 2, 8, "Metrics Grid");
    createMetricColumn(metricsRow, "Behavioral", data.success_metrics.behavioral);
    createMetricColumn(metricsRow, "Engagement", data.success_metrics.engagement);
  }
  return card;
}

function generateUserResearchSeparate(data, projectName) {
  var card = createStandaloneCard("03. User Research");
  addHeading(card, "❓ Research Questions", 3);
  addNumberedList(card, data.research_questions);
  addHeading(card, "🔬 Methods", 3);
  addBulletList(card, data.research_methods);
  addHeading(card, "🔍 Key Findings", 3);
  addBulletList(card, data.key_findings);
  addHeading(card, "💭 User Needs", 3);
  if (data.user_needs && typeof data.user_needs === 'object' && !Array.isArray(data.user_needs)) {
    var needsList = [
      "Functional: " + (data.user_needs.functional || "[Pending]"),
      "Emotional: " + (data.user_needs.emotional || "[Pending]"),
      "Social: " + (data.user_needs.social || "[Pending]")
    ];
    addBulletList(card, needsList);
  } else {
    addBulletList(card, data.user_needs);
  }
  addHeading(card, "😤 Frustrations", 3);
  addBulletList(card, data.frustrations_detected);
  if (Array.isArray(data.user_quotes) && data.user_quotes.length > 0) {
    addHeading(card, "💬 User Quotes", 3);
    for (var i = 0; i < Math.min(data.user_quotes.length, 2); i++) {
      addQuote(card, data.user_quotes[i]);
    }
  }
  return card;
}

function generateUserPersonaSeparate(data, projectName) {
  var card = createStandaloneCard("04. Persona: " + (data.name || "User"));

  var headerInfo = (data.age_occupation || "") + (data.location ? " — " + data.location : "");
  addBoldLabel(card, "👤 Age/Occupation", headerInfo);

  // BIO section with warm background
  var bioSection = figma.createFrame();
  bioSection.name = "BIO";
  bioSection.layoutMode = "VERTICAL";
  bioSection.primaryAxisSizingMode = "AUTO";
  bioSection.counterAxisSizingMode = "AUTO";
  bioSection.fills = [{ type: 'SOLID', color: { r: 0.996, g: 0.949, b: 0.878 } }];
  bioSection.cornerRadius = 8;
  bioSection.paddingTop = 12;
  bioSection.paddingBottom = 12;
  bioSection.paddingLeft = 14;
  bioSection.paddingRight = 14;
  bioSection.itemSpacing = 6;

  var bioTitle = figma.createText();
  bioTitle.fontName = { family: "Inter", style: "Bold" };
  bioTitle.fontSize = 11;
  bioTitle.characters = "📖 BIO";
  bioTitle.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.4, b: 0.2 } }];
  bioSection.appendChild(bioTitle);

  var bioText = figma.createText();
  bioText.fontName = { family: "Inter", style: "Regular" };
  bioText.fontSize = 11;
  bioText.characters = String(data.bio || "[Pending]");
  bioText.fills = [{ type: 'SOLID', color: currentTheme.text }];
  bioText.textAutoResize = "HEIGHT";
  bioSection.appendChild(bioText);
  bioText.layoutSizingHorizontal = "FILL";
  card.appendChild(bioSection);
  bioSection.layoutSizingHorizontal = "FILL";

  // Technology - handle both object and array
  var techItems;
  if (data.technology && typeof data.technology === 'object' && !Array.isArray(data.technology)) {
    techItems = [
      "Primary device: " + (data.technology.primary_device || "[Pending]"),
      "Key apps: " + (data.technology.key_apps || "[Pending]"),
      "Tech comfort: " + (data.technology.tech_comfort || "[Pending]")
    ];
  } else {
    techItems = data.technology;
  }

  // 2x2 Grid
  var personaGrid = figma.createFrame();
  personaGrid.name = "Persona Grid";
  personaGrid.layoutMode = "VERTICAL";
  personaGrid.primaryAxisSizingMode = "AUTO";
  personaGrid.counterAxisSizingMode = "AUTO";
  personaGrid.fills = [];
  personaGrid.itemSpacing = 10;

  var topRow = figma.createFrame();
  topRow.name = "Top Row";
  topRow.layoutMode = "HORIZONTAL";
  topRow.primaryAxisSizingMode = "AUTO";
  topRow.counterAxisSizingMode = "AUTO";
  topRow.fills = [];
  topRow.itemSpacing = 10;
  personaGrid.appendChild(topRow);

  createPersonaCell(topRow, "💻 Technology", techItems, false);
  createPersonaCell(topRow, "🎯 Objectives", data.user_objectives, true);
  topRow.layoutSizingHorizontal = "FILL";

  var bottomRow = figma.createFrame();
  bottomRow.name = "Bottom Row";
  bottomRow.layoutMode = "HORIZONTAL";
  bottomRow.primaryAxisSizingMode = "AUTO";
  bottomRow.counterAxisSizingMode = "AUTO";
  bottomRow.fills = [];
  bottomRow.itemSpacing = 10;
  personaGrid.appendChild(bottomRow);

  createPersonaCell(bottomRow, "🔥 Motivations", data.main_motivations, false);
  createPersonaCell(bottomRow, "😤 Frustrations", data.frustrations, false);
  bottomRow.layoutSizingHorizontal = "FILL";

  card.appendChild(personaGrid);
  personaGrid.layoutSizingHorizontal = "FILL";

  return card;
}

function generateEmpathyMapSeparate(data, projectName) {
  var card = createStandaloneCard("05. Empathy Map");
  createGrid2x2(card,
    [data.thinks, data.feels, data.says, data.does],
    ["🧠 THINKS", "❤️ FEELS", "💬 SAYS", "🖐️ DOES"]
  );
  addDivider(card);
  var painsGainsRow = createRow(card, 2, 12, "Pains & Gains");

  var painsCol = figma.createFrame();
  painsCol.name = "Pains";
  painsCol.layoutMode = "VERTICAL";
  painsCol.primaryAxisSizingMode = "AUTO";
  painsCol.counterAxisSizingMode = "AUTO";
  painsCol.fills = [{ type: 'SOLID', color: currentTheme.error, opacity: 0.1 }];
  painsCol.cornerRadius = 8;
  painsCol.paddingTop = 12;
  painsCol.paddingBottom = 12;
  painsCol.paddingLeft = 14;
  painsCol.paddingRight = 14;
  painsCol.itemSpacing = 6;
  var painsHeader = figma.createText();
  painsHeader.fontName = { family: "Inter", style: "Bold" };
  painsHeader.fontSize = 11;
  painsHeader.characters = "PAINS";
  painsHeader.fills = [{ type: 'SOLID', color: currentTheme.error }];
  painsCol.appendChild(painsHeader);
  var painsText = figma.createText();
  painsText.fontName = { family: "Inter", style: "Regular" };
  painsText.fontSize = 10;
  painsText.characters = String(data.pains || "[Pending]");
  painsText.fills = [{ type: 'SOLID', color: currentTheme.text }];
  painsText.textAutoResize = "HEIGHT";
  painsCol.appendChild(painsText);
  painsText.layoutSizingHorizontal = "FILL";
  painsGainsRow.appendChild(painsCol);
  painsCol.layoutSizingHorizontal = "FILL";

  var gainsCol = figma.createFrame();
  gainsCol.name = "Gains";
  gainsCol.layoutMode = "VERTICAL";
  gainsCol.primaryAxisSizingMode = "AUTO";
  gainsCol.counterAxisSizingMode = "AUTO";
  gainsCol.fills = [{ type: 'SOLID', color: currentTheme.success, opacity: 0.1 }];
  gainsCol.cornerRadius = 8;
  gainsCol.paddingTop = 12;
  gainsCol.paddingBottom = 12;
  gainsCol.paddingLeft = 14;
  gainsCol.paddingRight = 14;
  gainsCol.itemSpacing = 6;
  var gainsHeader = figma.createText();
  gainsHeader.fontName = { family: "Inter", style: "Bold" };
  gainsHeader.fontSize = 11;
  gainsHeader.characters = "GAINS";
  gainsHeader.fills = [{ type: 'SOLID', color: currentTheme.success }];
  gainsCol.appendChild(gainsHeader);
  var gainsText = figma.createText();
  gainsText.fontName = { family: "Inter", style: "Regular" };
  gainsText.fontSize = 10;
  gainsText.characters = String(data.gains || "[Pending]");
  gainsText.fills = [{ type: 'SOLID', color: currentTheme.text }];
  gainsText.textAutoResize = "HEIGHT";
  gainsCol.appendChild(gainsText);
  gainsText.layoutSizingHorizontal = "FILL";
  painsGainsRow.appendChild(gainsCol);
  gainsCol.layoutSizingHorizontal = "FILL";

  return card;
}

function generateJourneyMapSeparate(data, projectName) {
  if (!Array.isArray(data)) {
    var emptyCard = createStandaloneCard("06. User Journey Map");
    addParagraph(emptyCard, "[No journey data provided]");
    return emptyCard;
  }
  var card = createStandaloneCard("06. User Journey Map");
  var stagesContainer = figma.createFrame();
  stagesContainer.name = "Stages";
  stagesContainer.layoutMode = "HORIZONTAL";
  stagesContainer.primaryAxisSizingMode = "AUTO";
  stagesContainer.counterAxisSizingMode = "AUTO";
  stagesContainer.fills = [];
  stagesContainer.itemSpacing = 12;
  stagesContainer.layoutWrap = "NO_WRAP";

  for (var i = 0; i < data.length; i++) {
    var stage = data[i];
    var stageCol = figma.createFrame();
    stageCol.name = "Stage " + (i + 1);
    stageCol.layoutMode = "VERTICAL";
    stageCol.primaryAxisSizingMode = "AUTO";
    stageCol.counterAxisSizingMode = "FIXED";
    stageCol.resize(150, 100);
    stageCol.fills = [{ type: 'SOLID', color: currentTheme.bg, opacity: 0.5 }];
    stageCol.cornerRadius = 8;
    stageCol.paddingTop = 12;
    stageCol.paddingBottom = 12;
    stageCol.paddingLeft = 12;
    stageCol.paddingRight = 12;
    stageCol.itemSpacing = 8;
    stageCol.strokeWeight = 1;
    stageCol.strokes = [{ type: 'SOLID', color: currentTheme.accent, opacity: 0.2 }];

    var stageNum = figma.createText();
    stageNum.fontName = { family: "Inter", style: "Bold" };
    stageNum.fontSize = 9;
    stageNum.characters = "STAGE " + (i + 1);
    stageNum.fills = [{ type: 'SOLID', color: currentTheme.accent }];
    stageCol.appendChild(stageNum);

    var stageName = figma.createText();
    stageName.fontName = { family: "Inter", style: "Medium" };
    stageName.fontSize = 11;
    stageName.characters = stage.stage || "[Stage]";
    stageName.fills = [{ type: 'SOLID', color: currentTheme.text }];
    stageCol.appendChild(stageName);

    // Timeline
    var timeline = figma.createText();
    timeline.fontName = { family: "Inter", style: "Regular" };
    timeline.fontSize = 9;
    timeline.characters = "📅 " + (stage.timeline || "Day X");
    timeline.fills = [{ type: 'SOLID', color: currentTheme.muted }];
    stageCol.appendChild(timeline);

    if (Array.isArray(stage.actions)) {
      var actionsLabel = figma.createText();
      actionsLabel.fontName = { family: "Inter", style: "Medium" };
      actionsLabel.fontSize = 9;
      actionsLabel.characters = "🖐️ ACTIONS";
      actionsLabel.fills = [{ type: 'SOLID', color: currentTheme.muted }];
      stageCol.appendChild(actionsLabel);
      for (var a = 0; a < Math.min(stage.actions.length, 3); a++) {
        var actionText = figma.createText();
        actionText.fontName = { family: "Inter", style: "Regular" };
        actionText.fontSize = 9;
        actionText.characters = "• " + (stage.actions[a] || "");
        actionText.fills = [{ type: 'SOLID', color: currentTheme.text }];
        actionText.textAutoResize = "HEIGHT";
        stageCol.appendChild(actionText);
        actionText.layoutSizingHorizontal = "FILL";
      }
    }

    // Feelings
    if (stage.feelings) {
      var feelingsContent = "";
      if (typeof stage.feelings === 'object') {
        feelingsContent = (stage.feelings.start || "") + " → " + (stage.feelings.end || "");
      } else {
        feelingsContent = String(stage.feelings);
      }
      var feelingsText = figma.createText();
      feelingsText.fontName = { family: "Inter", style: "Regular" };
      feelingsText.fontSize = 9;
      feelingsText.characters = "❤️ " + feelingsContent;
      feelingsText.fills = [{ type: 'SOLID', color: currentTheme.warning }];
      feelingsText.textAutoResize = "HEIGHT";
      stageCol.appendChild(feelingsText);
      feelingsText.layoutSizingHorizontal = "FILL";
    }

    stagesContainer.appendChild(stageCol);
  }

  card.appendChild(stagesContainer);
  return card;
}

function generateResearchSynthesisSeparate(data, projectName) {
  var card = createStandaloneCard("07. Research Synthesis");
  addHeading(card, "🔍 Key Insights", 2);
  if (Array.isArray(data.key_insights)) {
    for (var i = 0; i < data.key_insights.length; i++) {
      var insight = data.key_insights[i];
      var insightFrame = figma.createFrame();
      insightFrame.name = "Insight " + (i + 1);
      insightFrame.layoutMode = "VERTICAL";
      insightFrame.primaryAxisSizingMode = "AUTO";
      insightFrame.counterAxisSizingMode = "AUTO";
      insightFrame.fills = [{ type: 'SOLID', color: currentTheme.accent, opacity: 0.08 }];
      insightFrame.cornerRadius = 6;
      insightFrame.paddingTop = 10;
      insightFrame.paddingBottom = 10;
      insightFrame.paddingLeft = 12;
      insightFrame.paddingRight = 12;
      insightFrame.itemSpacing = 4;

      var insightTitle = figma.createText();
      insightTitle.fontName = { family: "Inter", style: "Bold" };
      insightTitle.fontSize = 10;
      insightTitle.characters = insight.title || "[Insight]";
      insightTitle.fills = [{ type: 'SOLID', color: currentTheme.accent }];
      insightFrame.appendChild(insightTitle);

      if (insight.evidence) {
        var evidenceText = figma.createText();
        evidenceText.fontName = { family: "Inter", style: "Regular" };
        evidenceText.fontSize = 9;
        evidenceText.characters = "Evidence: " + insight.evidence;
        evidenceText.fills = [{ type: 'SOLID', color: currentTheme.muted }];
        evidenceText.textAutoResize = "HEIGHT";
        insightFrame.appendChild(evidenceText);
        evidenceText.layoutSizingHorizontal = "FILL";
      }

      if (insight.implication) {
        var impText = figma.createText();
        impText.fontName = { family: "Inter", style: "Regular" };
        impText.fontSize = 9;
        impText.characters = "Implication: " + insight.implication;
        impText.fills = [{ type: 'SOLID', color: currentTheme.text }];
        impText.textAutoResize = "HEIGHT";
        insightFrame.appendChild(impText);
        impText.layoutSizingHorizontal = "FILL";
      }

      card.appendChild(insightFrame);
      insightFrame.layoutSizingHorizontal = "FILL";
    }
  }

  if (data.how_might_we) {
    addDivider(card);
    addHeading(card, "❓ How Might We", 2);
    if (Array.isArray(data.how_might_we)) {
      addBulletList(card, data.how_might_we, "HMW Questions");
    } else {
      var hmwRow = createRow(card, 2, 12, "HMW Grid");
      createMetricColumn(hmwRow, "Primary", data.how_might_we.primary);
      createMetricColumn(hmwRow, "Secondary", data.how_might_we.secondary);
    }
  }

  if (Array.isArray(data.design_principles) && data.design_principles.length > 0) {
    addDivider(card);
    addHeading(card, "📐 Design Principles", 2);
    for (var j = 0; j < data.design_principles.length; j++) {
      var p = data.design_principles[j];
      var principleFrame = figma.createFrame();
      principleFrame.name = "Principle " + (j + 1);
      principleFrame.layoutMode = "VERTICAL";
      principleFrame.primaryAxisSizingMode = "AUTO";
      principleFrame.counterAxisSizingMode = "AUTO";
      principleFrame.fills = [{ type: 'SOLID', color: currentTheme.bg, opacity: 0.5 }];
      principleFrame.cornerRadius = 6;
      principleFrame.paddingTop = 10;
      principleFrame.paddingBottom = 10;
      principleFrame.paddingLeft = 12;
      principleFrame.paddingRight = 12;
      principleFrame.itemSpacing = 4;

      var principleTitle = figma.createText();
      principleTitle.fontName = { family: "Inter", style: "Bold" };
      principleTitle.fontSize = 10;
      principleTitle.characters = "# " + (p.name || "[Principle]");
      principleTitle.fills = [{ type: 'SOLID', color: currentTheme.accent }];
      principleFrame.appendChild(principleTitle);

      addBoldLabel(principleFrame, "Definition", p.definition);
      addBoldLabel(principleFrame, "Rationale", p.rationale);
      addBoldLabel(principleFrame, "Application", p.application);

      card.appendChild(principleFrame);
      principleFrame.layoutSizingHorizontal = "FILL";
    }
  }

  return card;
}
