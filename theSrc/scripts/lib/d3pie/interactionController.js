import { interactionLogger } from '../logger'

class InteractionController {
  constructor () {
    this.segmentController = null
    this.groupLabelController = null
    this.segmentLabelController = null
    this.tooltipController = null
    this.hasSegments = false
    this.hasGroupLabels = false
    this.hasSegmentLabels = false
    this.hasTooltips = false
  }

  addSegmentController (segmentController) {
    this.segmentController = segmentController
    this.hasSegments = true
  }

  addGroupLabelController (groupLabelController) {
    this.groupLabelController = groupLabelController
    this.hasGroupLabels = true
  }

  addSegmentLabelController (segmentLabelController) {
    this.segmentLabelController = segmentLabelController
    this.hasSegmentLabels = true
  }

  addTooltipController (tooltipController) {
    this.tooltipController = tooltipController
    this.hasTooltips = true
  }

  hoverOnSegment (id) {
    interactionLogger.debug(`hoverOnSegment(${id})`)
    this.highlightSegment(id)
    this.highlightSegmentLabel(id)

    if (this.hasTooltips && (!this.hasSegmentLabels || !this.segmentLabelController.isLabelShown(id))) {
      this.tooltipController.showTooltip(id)
    }
  }

  hoverOffSegment (id) {
    interactionLogger.debug(`hoverOffSegment(${id})`)
    this.unhighlightSegment(id)
    this.unhighlightSegmentLabel(id)

    if (this.hasTooltips) {
      this.tooltipController.hideTooltip(id)
    }
  }

  hoverOnGroupSegment (id) {
    interactionLogger.debug(`hoverOnGroupSegment(${id})`)
    this.highlightGroupSegment(id)
    if (this.hasTooltips && (!this.hasGroupLabels || !this.groupLabelController.isLabelShown(id))) {
      this.tooltipController.showGroupTooltip(id)
    }
  }

  hoverOffGroupSegment (id) {
    interactionLogger.debug(`hoverOffGroupSegment(${id})`)
    this.unhighlightGroupSegment(id)
    if (this.hasTooltips) {
      this.tooltipController.hideGroupTooltip(id)
    }
  }

  hoverOnGroupSegmentLabel (id) {
    interactionLogger.debug(`hoverOnGroupSegmentLabel(${id})`)
    this.highlightGroupSegment(id)
  }

  hoverOffGroupSegmentLabel (id) {
    interactionLogger.debug(`hoverOffGroupSegmentLabel(${id})`)
    this.unhighlightGroupSegment(id)
  }

  hoverOnSegmentLabel (id) {
    interactionLogger.debug(`hoverOnSegmentLabel(${id})`)
    this.highlightSegment(id)
    this.highlightSegmentLabel(id)
  }

  hoverOffSegmentLabel (id) {
    interactionLogger.debug(`hoverOffSegmentLabel(${id})`)
    this.unhighlightSegment(id)
    this.unhighlightSegmentLabel(id)
  }

  highlightSegment (id) {
    interactionLogger.debug(`highlightSegment(${id})`)
    if (this.hasSegments) { this.segmentController.highlightSegment(id) }
  }

  unhighlightSegment (id) {
    interactionLogger.debug(`unhighlightSegment(${id})`)
    if (this.hasSegments) { this.segmentController.unhighlightSegment(id) }
  }

  highlightSegmentLabel (id) {
    interactionLogger.debug(`highlightSegmentLabel(${id})`)
    if (this.hasSegmentLabels) { this.segmentLabelController.highlightLabel(id) }
  }

  unhighlightSegmentLabel (id) {
    interactionLogger.debug(`unhighlightSegmentLabel(${id})`)
    if (this.hasSegmentLabels) { this.segmentLabelController.unhighlightLabel(id) }
  }

  highlightGroupSegment (id) {
    interactionLogger.debug(`highlightGroupSegment(${id})`)
    if (this.hasSegments) { this.segmentController.highlightGroupSegment(id) }
  }

  unhighlightGroupSegment (id) {
    interactionLogger.debug(`unhighlightGroupSegment(${id})`)
    if (this.hasSegments) { this.segmentController.unhighlightGroupSegment(id) }
  }
}

module.exports = InteractionController
