import computeLabelLineMaxAngleCoords from '../../scripts/lib/d3pie/labellers/segmentLabeller/utils/computeLabelLineMaxAngleCoords'
import math from '../../scripts/lib/d3pie/math'

document.addEventListener('DOMContentLoaded', () => {
  console.log('loading test fixtures onto window.testFixtures')
  window.testFixtures = {
    computeLabelLineMaxAngleCoords,
    math
  }
}, false)