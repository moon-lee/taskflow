import { SampleView } from './taskflow-view';
if (typeof customElements !== 'undefined' && !customElements.get('taskflow-view')) customElements.define('taskflow-view', SampleView as unknown as CustomElementConstructor);
