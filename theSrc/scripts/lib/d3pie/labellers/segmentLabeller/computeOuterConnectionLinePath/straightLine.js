module.exports = ({ labelData }) => {
  const { x: sx, y: sy } = labelData.segmentMidpointCoord
  const { x: lx, y: ly } = labelData.lineConnectorCoord
  return {
    path: `M ${sx} ${sy} L ${lx} ${ly}`,
    pathType: 'straight',
  }
}
