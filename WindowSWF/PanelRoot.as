package{

	import adobe.utils.MMEndCommand;
	import adobe.utils.MMExecute;

	import fl.controls.ProgressBarMode;
	import fl.events.ListEvent;
	import fl.data.DataProvider;

	import flash.events.*;
	import flash.external.ExternalInterface;
	import flash.text.*;
	import flash.utils.*;
	import flash.net.*;
	import flash.ui.*;


	import flash.display.*;
	import fl.containers.*;
	import fl.controls.*;

	import assets.ControlLayout;


	public class PanelRoot extends MovieClip{


		private var timer:Timer=new Timer(1);
		private var isCanceled:Boolean=false;
		private var finished:Boolean=false;
		private var swfPanelName:String='SVG';


		private var controlsLayout:ControlLayout;
		private var controlsLogic:ControlsLogic;

		private var _dev:Boolean;

		public function get dev():Boolean{
			return _dev;
		}
		public function set dev(value:Boolean):void{
			_dev = value;
			context.customItems = _dev?[devModeOnItem]:[devModeOffItem];
			_panelSettings.updateSetting(this, "dev");
		}

		private var context:ContextMenu;
		private var devModeOnItem:ContextMenuItem;
		private var devModeOffItem:ContextMenuItem;

		private var _panelSettings:SettingsSaver;
		private var _exportSettings:SettingsSaver;

		private var _genericName:String;
		private var _usingGeneric:Boolean;
		
		public function PanelRoot(){

			this.alpha = 0;

			controlsLayout = new ControlLayout();
			scrollPane.source = controlsLayout;

			controlsLogic = new ControlsLogic(controlsLayout);


			devModeOnItem = new ContextMenuItem("Turn dev mode off");
			devModeOnItem.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, toggleDevMode);

			devModeOffItem = new ContextMenuItem("Turn dev mode on");
			devModeOffItem.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, toggleDevMode);

			context = new ContextMenu();
			context.hideBuiltInItems();
			this.contextMenu = context;

			stage.align=StageAlign.TOP_LEFT;
			stage.scaleMode=StageScaleMode.NO_SCALE;

			setTimeout(doIntro, 500); // delays allow components to initialise fully

			var panelRef:PanelRoot = this;


			//Initialize Javascript
			_dev=(
				MMExecute([
					'if(!this.extensible){',
					'	fl.runScript(fl.configURI+"Javascript/Extensible/init.jsfl");',
					'}',
					'extensible.dev.valueOf()'
				].join('\n'))=='true'
			);
			var jsDir:String = MMExecute('extensible.dir.valueOf()');

			_panelSettings = new SettingsSaver(jsDir+'/Settings/SVGPanel/', true);
			_panelSettings.addSetting(this, "dev", "dev", _dev);
			_panelSettings.setSettingTitle("Settings", true);

			_exportSettings = new SettingsSaver(jsDir+'/Settings/SVG/', false, confirmOverwrite, "SVGExportOptions", this.swfPanelName);
			_exportSettings.addEventListener(SettingsSaver.EVENT_STATE_CHANGED, exportStateChanged);
			_exportSettings.addEventListener(SettingsSaver.EVENT_GROUPS_CHANGED, exportGroupsChanged);


			this.controlsLayout.fileRow.input.addEventListener(
				Event.CHANGE,
				checkFileInput
			);

			_exportSettings.addSetting(controlsLayout.fileRow.input, "text", "file", null, false, fileGetter, fileSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.sourceRow.input, "selectedIndex", "source", "current", false, comboGetter, comboSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.framesRow.input, "selectedIndex", "frames", "all", false, comboGetter, comboSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.outputRow.input, "selectedIndex", "output", "animation", false, comboGetter, comboSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.clippingRow.clipToScalingGridRadioButton, "selected", "clipToScalingGrid", false, false, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.clippingRow.clipToBoundingBoxRadioButton, "selected", "clipToBoundingBox", true, false, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.customFramesRow.startFrameNumericStepper, "value", "startFrame", 0, false, null, null, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.customFramesRow.endFrameNumericStepper, "value", "endFrame", 0, false, null, null, Event.CHANGE);

			_exportSettings.addSetting(controlsLayout.masksRow.input, "selectedIndex", "maskingType", "clipping", true, comboGetter, comboSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.decimalRow.input, "value", "decimalPointPrecision", 3, true, null, null, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.curvesRow.input, "selectedIndex", "curveDegree", 2, true, comboGetter, comboSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.expandRow.input, "selectedIndex", "expandSymbols", "none", true, comboGetter, comboSetter, Event.CHANGE);
			//_exportSettings.addSetting(controlsLayout.beginRow.input, "selectedIndex", "beginAnimation", "0", true, comboGetter, comboSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.renderingRow.input, "selectedIndex", "rendering", "auto", true, comboGetter, comboSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.applyTransformationsCheckBox, "selected", "applyTransformations", true, true, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.convertPatternsToSymbolsCheckBox, "selected", "convertPatternsToSymbols", true, true, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.flattenMotionCheckBox, "selected", "flattenMotion", false, true, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.includeBackgroundCheckBox, "selected", "includeBackground", false, true, radioGetter, radioSetter, Event.CHANGE);

			exportGroupsChanged();

			if(_exportSettings.state==SettingsSaver.STATE_UNLOADED){
				_panelSettings.setToFirst(false);
			}


			this.controlsLayout.sourceRow.input.dataProvider = new DataProvider([{label:'Current Timeline', showBoundsInput:false, 	data:"current"},
																			{label:'Selected Library Items', showBoundsInput:true, 	data:"libraryItems"}]);

			this.controlsLayout.framesRow.input.dataProvider = new DataProvider([{label:'All Frames', showFrameInput:false, 		data:"all"},
																			{label:'Current Frame', showFrameInput:false, 			data:"current"},
																			{label:'Custom Range', showFrameInput:true, 			data:"custom"}]);

			this.controlsLayout.outputRow.input.dataProvider = new DataProvider([{label:'Animated SVG', showFlattenMotion:true, 	data:"animation"},
																			{label:'SVG Images', showFlattenMotion:false, 			data:"images"}]);

			this.controlsLayout.masksRow.input.dataProvider = new DataProvider([{label:'Clipping', 			data:"clipping"},
																				{label:'Alpha', 			data:"alpha"},
																				{label:'Luminance', 		data:"luminance"}]);

			this.controlsLayout.curvesRow.input.dataProvider = new DataProvider([{label:'Quadratic', 		data:2},
																				 {label:'Cubic', 			data:3}]);

			this.controlsLayout.expandRow.input.dataProvider = new DataProvider([{label:'All', 				data:"all"},
																				 {label:'None', 			data:"none"},
																				 {label:'Nested', 			data:"nested"}]);
			
			//Inputs
			this.controlsLayout.fileRow.button.addEventListener(
				MouseEvent.CLICK,
				browseForFile
			);
			this.controlsLayout.presetRow.deleteButton.addEventListener(
				MouseEvent.CLICK,
				deletePreset
			);
			this.controlsLayout.presetRow.saveButton.addEventListener(
				MouseEvent.CLICK,
				savePreset
			);
			this.controlsLayout.presetRow.comboBox.addEventListener(
				Event.CHANGE,
				presetComboChange
			);
			this.controlsLayout.exportButton.addEventListener(
				MouseEvent.CLICK,
				exportSVG
			);
			this.controlsLayout.sourceRow.input.addEventListener(
				Event.CHANGE,
				onSourceChanged
			);
			this.controlsLayout.framesRow.input.addEventListener(
				Event.CHANGE,
				onFramesChanged
			);
			this.controlsLayout.outputRow.input.addEventListener(
				Event.CHANGE,
				onOutputChanged
			);
			//ProgressBar
			this.controlsLayout.progressBar.minimum=0;
			this.timer.repeatCount=2999;

			// For some reasons, this only works after a delay...
			//setTimeout(finSetup,500);


			// Document change...
			ExternalInterface.addCallback('documentChanged',documentChanged);
			MMExecute([
				'fl.addEventListener(',
				'	"documentChanged",',
				'	function(){',
				'		extensible.swfPanel("'+swfPanelName+'").call("documentChanged'+'");',
				'	}',
				');'
			].join('\n'));

			documentChanged();

			_exportSettings.init();
		}

		private function documentChanged():void{
			DelayedCall.call(doDocumentChanged, 0.1); // flash calls the handler multiple times, this will collate them
		}

		public function doDocumentChanged():void{
			if(MMExecute('extensible.doc')=="null"){
				controlsLogic.setEnabled(false);
			}else{
				controlsLogic.setEnabled(true);
				if(MMExecute('extensible.doc.pathURI')!=='undefined'){
					_genericName = this.controlsLayout.fileRow.input.text=MMExecute('extensible.doc.pathURI.relativeToDocument.stripExtension()')+'.svg';
				}else{
					_genericName = this.controlsLayout.fileRow.input.text=MMExecute('extensible.doc.name.stripExtension()')+'.svg';
				}
			}
			checkFileInput();
			finSetup();
		}


		private function finSetup():void{
			onSourceChanged();
			onFramesChanged();
			onOutputChanged();
		}

		private var _contHandler:Function;
		private function confirmOverwrite(contHandler:Function):void{
			_contHandler = contHandler;
			if(Fl.confirm("Are you sure?\nThis will overwrite the preset '"+_exportSettings.settingTitle+"'")){
				_contHandler();
			}
			_contHandler = null;
		}
		private function exportGroupsChanged(e:Event=null):void{
			var titles:Array = [];

			for each(var group in _exportSettings.settingsGroups){
				titles.push(group.title);
			}

			controlsLayout.presetRow.comboBox.dataProvider = new DataProvider(titles);
		}

		private function exportStateChanged(e:Event):void{
			var existing:SettingGroup = _exportSettings.getSettingGroup(_exportSettings.settingTitle);
			if(_exportSettings.state==SettingsSaver.STATE_MODIFIED){
				if(existing && !existing.userCreated){
					_exportSettings.setSettingTitle(null, false);
					return;
				}
			}
			if(_exportSettings.settingTitle){
				controlsLayout.presetRow.comboBox.text = _exportSettings.settingTitle;
			}else{
				controlsLayout.presetRow.comboBox.text = "";
			}
			controlsLayout.presetRow.saveButton.visible = (!existing || _exportSettings.state==SettingsSaver.STATE_MODIFIED || _exportSettings.state==SettingsSaver.STATE_UNSAVED);
			controlsLayout.presetRow.deleteButton.enabled = (!existing || !existing.userCreated);
			controlsLayout.presetRow.deleteButton.visible = (!controlsLayout.presetRow.saveButton.visible);
			controlsLayout.presetRow.deleteButton.enabled = (existing && existing.userCreated);
		}

		private function presetComboChange(e:Event){
			if(controlsLayout.presetRow.comboBox.selectedIndex==-1){
				_exportSettings.setSettingTitle(controlsLayout.presetRow.comboBox.text, true);
			}else{
				_exportSettings.setSettingTitle(controlsLayout.presetRow.comboBox.selectedItem.label, true);
			}
		}

		private function deletePreset(e:Event){
			_exportSettings.remove();
		}

		private function savePreset(e:Event){
			if(!_exportSettings.settingTitle){
				Fl.alert("Must add a title");
				stage.focus = controlsLayout.presetRow.comboBox;
			}else{
				_exportSettings.save();
			}
		}

		private function checkFileInput(e:Event=null):void{
			_usingGeneric = (!controlsLayout.fileRow.input.text || controlsLayout.fileRow.input.text==_genericName);
		}
		private function fileSetter(input:TextInput, prop:String, value:String):void{
			_usingGeneric = (!value || value == _genericName);
			if(_usingGeneric){
				input.text = _genericName;
			}else{
				input.text = value;
			}
		}
		private function fileGetter(input:TextInput, prop:String):String{
			if(_usingGeneric){
				return null;
			}else{
				return input.text==""?null:input.text;
			}
		}

		private function radioSetter(input:*, prop:String, value:*):void{
			input.selected = (value==true || value=="true"?true:false);
		}
		private function radioGetter(input:*, prop:String):Boolean{
			return input.selected;
		}

		private function comboSetter(combo:ComboBox, prop:String, value:String):void{
			for(var i=0;i<combo.length;i++){
				if(combo.getItemAt(i).data==value){
					combo.selectedIndex = i;
					return;
				}
			}
			combo.selectedIndex = -1;
		}
		private function comboGetter(combo:ComboBox, prop:String):String{
			return combo.selectedItem?combo.selectedItem.data:null;
		}

		private function toggleDevMode(e:Event):void{
			dev = !dev;
		}

		private function doIntro():void{
			this.alpha = 1;
			// this initialises the controls
			controlsLogic.setSize(scrollPane.width-(scrollPane.verticalScrollBar.visible?15:0), scrollPane.height);

			stage.addEventListener(Event.RESIZE,onStageResize);
			onStageResize();
		}

		private function onStageResize(e:Event=null):void{
			scrollPane.setSize(stage.stageWidth, stage.stageHeight);
			controlsLogic.setSize(stage.stageWidth-(scrollPane.verticalScrollBar.visible?15:0), stage.stageHeight);
		}
		
		private function browseForFile(e:MouseEvent){
			var fileURI:String=MMExecute('fl.browseForFileURL("save","Export")');
			var filePath:String=MMExecute('"'+fileURI+'".relativeToDocument');
			this.controlsLayout.fileRow.input.text=filePath;
			_exportSettings.updateSetting(controlsLayout.fileRow, "text");
		}
		
		private function onSourceChanged(e:Event=null):void{
			this.controlsLayout.clippingRow.visible = (this.controlsLayout.sourceRow.input.selectedItem && this.controlsLayout.sourceRow.input.selectedItem.showBoundsInput);
			controlsLogic.update();
		}
		private function onFramesChanged(e:Event=null):void{
			this.controlsLayout.customFramesRow.visible = (this.controlsLayout.framesRow.input.selectedItem && this.controlsLayout.framesRow.input.selectedItem.showFrameInput);
			controlsLogic.update();
		}
		private function onOutputChanged(e:Event=null):void{
			var isAnim:Boolean = (this.controlsLayout.outputRow.input.selectedItem && this.controlsLayout.outputRow.input.selectedItem.showFlattenMotion);
			//this.controlsLayout.beginRow.visible = isAnim;
			this.controlsLayout.flattenMotionCheckBox.visible = isAnim;
			controlsLogic.update();
		}
		
		private function exportSVG(e:Event):void
		{

			this.controlsLogic.setEnabled(false);
			this.isCanceled=this.finished=false;
			//Switch exportBttn to 'Cancel'
			this.controlsLayout.exportButton.label='Cancel';
			this.controlsLayout.exportButton.removeEventListener(
				MouseEvent.CLICK,
				exportSVG
			);
			this.controlsLayout.exportButton.addEventListener(
				MouseEvent.CLICK,
				cancel
			);
			// Show indeterminate bar until progress starts...
			this.controlsLayout.progressBar.indeterminate=true;
			this.controlsLayout.progressBar.mode=ProgressBarMode.EVENT;
			ExternalInterface.addCallback('setProgress',setProgress);
			ExternalInterface.addCallback('endProgress',endProgress);
			//Save options
			var xml = _exportSettings.getXml();
			if(_usingGeneric){
				xml.appendChild(new XML("<file>"+_genericName+"</file>"));
			}
			xml['swfPanelName']='SVG';
			if(dev){
				MMExecute([
					'if(extensible && extensible.builderURI){',
					'	fl.runScript(extensible.builderURI);',
					'}',
					'fl.runScript(fl.configURI+"Javascript/Extensible/init.jsfl");'
				].join('\n'));
			}
			var cmd=[
				'extensible.que.push(',
				'	new extensible.SVG(',
						xml.toXMLString(),
				'	)',
				');'
			].join('\n');
			MMExecute(cmd);
		}
		private function cancel(e:Event):void
		{
			this.controlsLogic.setEnabled(true);
			if(this.isCanceled||this.finished){return;}
			this.isCanceled=true;
			this.endProgress();
			var killed;
			try{
				killed=MMExecute('extensible.que.kill()');
			}catch(e){}
			if(!killed=='true'){ // If kill command does not return "true"
				this.controlsLayout.progressBar.setProgress(0,100);
			}
			Fl.trace("SVG Export Failed");
		}
		
		private function processQue(e:Event):void
		{
			if(this.isCanceled||this.finished){return;}
			if(this.timer.delay<100){this.timer.delay=100;}
			// attempt to process the que
			var success,err;
			try{
				success=MMExecute('extensible.que.process()');
			}catch(err){}
			if(success=='true'){
				this.timer.stop();
			}else{ // increase the delay with each failure
				if(this.timer.delay>120){
					this.cancel(e);
				}
				this.timer.delay+=20;
			}
		}
		
		public function setProgress(completed:Number,max:Number):Boolean
		{
			this.controlsLayout.progressBar.indeterminate=false;
			this.controlsLayout.progressBar.mode=ProgressBarMode.MANUAL;
			this.controlsLayout.progressBar.setProgress(completed,max);
			// this is a total hack
			this.timer=new Timer(0);
			this.timer.addEventListener(
				TimerEvent.TIMER,
				processQue
			);
			this.timer.addEventListener(
				TimerEvent.TIMER_COMPLETE,
				function(e:Event){this.endProgress();}
			);
			this.timer.start();
			return true;
		}
		
		public function endProgress():Boolean
		{
			this.controlsLogic.setEnabled(true);
			this.controlsLayout.progressBar.indeterminate=false;
			this.controlsLayout.progressBar.mode=ProgressBarMode.MANUAL;
			// return exportBttn to original state
			this.controlsLayout.exportButton.label='Export';
			this.controlsLayout.exportButton.removeEventListener(
				MouseEvent.CLICK,
				cancel
			);
			this.controlsLayout.exportButton.addEventListener(
				MouseEvent.CLICK,
				exportSVG
			);
			ExternalInterface.addCallback('setProgress',null);
			ExternalInterface.addCallback('endProgress',null);
			if(this.timer){
				this.timer.stop();
			}
			if(!this.isCanceled){
				this.setProgress(100,100);
			}
			return true;
		}
	}

}