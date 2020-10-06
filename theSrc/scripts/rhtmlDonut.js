/* global HTMLWidgets */

import 'babel-polyfill'
import widgetFactory from './rhtmlDonut.factory'

HTMLWidgets.widget({
  name: 'rhtmlDonut',
  type: 'output',
  factory: widgetFactory,
})
