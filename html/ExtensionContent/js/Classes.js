function extendAsEventDispatcher(within) {
    if (within._listeners == null)
    {
    	within._listeners = [];
    }
    within.isEventDispatcher = true;
    if (typeof(within.dispatchEvent) == "undefined")
    {
    	within.dispatchEvent = function(eventObject)
        {
            for ( var i = 0; i < within._listeners.length; i++)
            {
                var test = within._listeners[i];
                if (test.type === eventObject.type)
                {
                   test.callback(eventObject);
                   break;
                }
            }
        };
    }
    if (typeof(within.addEventListener) == "undefined")
    {
    	within.addEventListener = function (type, callback, capture) 
        {
            // no dupes
            var declared = false;
            for ( var i = 0; i < within._listeners.length; i++)
            {
                var test = within._listeners[i];
                if (test.type === type && test.callback === callback)
                {
                    declared = true;
                    break;
                }
            }
            if (!declared)
            {
            	within._listeners.push({'type':type,'callback':callback,'capture':capture});
            }
        };
    }    
};


closure = function(scope, meth, args, passArgs){
	if(passArgs || passArgs===null){
		return function(){
			var args2 = Array.prototype.slice.call(arguments);
			return meth.apply(scope, args2.concat(args));
		};
	}else{
		return function(){
			return meth.apply(scope, args);
		};
	}
};


// Settings
function Settings(){
	this.props = {};
	return this;
}
Settings.VERSION = 1;

Settings.EXPORT_SETTINGS = "exportSettings";
Settings.ACTIVE_PANELS = "activePanels";
Settings.AUTO_SAVE_TIMELINE = "autoSaveTimeline";

Settings.SOURCE = "source";
Settings.FILE = "file";
Settings.PRECISION = "decimalPointPrecision";
Settings.EXPAND_SYMBOLS = "expandSymbols";
Settings.RENDERING = "rendering";
Settings.ROOT_SCALING = "rootScaling";
Settings.CONVERT_PATTERNS = "convertPatternsToSymbols";
Settings.APPLY_TRANSFORMS = "applyTransformations";
Settings.APPLY_EFFECTS = "applyColorEffects";
Settings.FLATTEN_MOTION = "flattenMotion";
Settings.CURVE_DEGREE = "curveDegree";
Settings.MASKING_TYPE = "maskingType";
Settings.OUTPUT = "output";
Settings.FRAMES = "frames";
Settings.START_FRAME = "startFrame";
Settings.END_FRAME = "endFrame";
Settings.ANIMATED = "animated";
Settings.TIMELINES = "timelines";
Settings.BG_COLOR = "backgroundColor";
Settings.INCLUDE_BG = "includeBackground";
Settings.INCLUDE_HIDDEN_LAYERS = "includeHiddenLayers";
Settings.INCLUDE_GUIDES = "includeGuides";
Settings.CONVERT_TEXT_TO_OUTLINES = "convertTextToOutlines";
Settings.SELECTION = "selection";
Settings.TRACE_LOG = "traceLog";
Settings.BEGIN_ANIMATION = "beginAnimation";
Settings.REPEAT_COUNT = "repeatCount";
Settings.NON_ANIM_SHOW = "nonAnimatingShow";
Settings.LOOP = "loop";
Settings.LOOP_TWEENS = "loopTweens";
Settings.DISCRETE_EASING = "discreteEasing";
Settings.REMOVE_GROUPS = "removeGroups";
Settings.COMPACT_OUTPUT = "compactOutput";
Settings.AVOID_MITER = "avoidMiter";
Settings.TWEEN_TYPE = "tweenType";

Settings.parse = function(str){
	var ret = new Settings();
	ret.parse(str);
	return ret;
};

Settings.replacer = function(key, value) {
  if(value instanceof Settings){
	  return value.toObject();
  }else if(typeof(value) == "string"){
	  value = value.split('\\').join('\\\\');
	  value = value.split('"').join('\\"');
	  return value;
  }else{
	  return value;
  }
};


Settings.prototype={
	change:null,
	propChangeHandlers:{},
	setProp:function(prop, value){
		var existing = this.props[prop];
		if(existing==value)return;
		
		if(value instanceof Settings && existing){
			for(var i in existing){
				value.setProp(i, existing[i]);
			}
		}
		this.props[prop] = value;
		this._dispatchChange([prop]);
	},
	getProp:function(prop){
		return this.props[prop];
	},
	hasProp:function(prop){
		return this.props[prop] != undefined;
	},
	addPropChangeHandler:function(prop, handler){
		this.propChangeHandlers[prop] = handler;
	},
	clearProp:function(prop){
		delete this.props[prop];
		this._dispatchChange([prop]);
	},
	toObject:function(){
		return {version:Settings.VERSION, props:this.props};
	},
	stringify:function(defaults, include){
		var obj = this.toObject();
		if(defaults || include){
			var props = {};
			for(var i in obj.props){
				if(include && include.indexOf(i)==-1)continue;
				
				props[i] = obj.props[i];
			}
			if(defaults){
				for(var i in defaults){
					if(props[i]==null || props[i]==""){
						props[i] = defaults[i];
					}
				}
			}
			obj.props = props;
		}
		return JSON.stringify(obj, Settings.replacer);
	},
	parse:function(str){
		var obj = JSON.parse(str);
		if(obj && obj.props)this.props = obj.props;
		else this.props = {};
	},
	fill:function(str){
		var obj;
		if(typeof(str)=="string")obj = JSON.parse(str);
		else obj = str;
		
		if(obj.version && obj.props){
			if(obj.version!=Settings.VERSION){
				// do future migrations here
			}
			obj = obj.props;
		}
		
		var props = [];
		for(var i in obj){
			var value = obj[i];
			var existing = this.props[i];
			if(existing==value)continue;
			
			if(existing instanceof Settings){
				existing.fill(value);
			}else{
				this.props[i] = obj[i];
				props.push(i);
			}
		}
		this._dispatchChange(props);
	},
	_dispatchChange:function(props){
		if(props){
			for(var i=0; i<props.length; ++i){
				var prop = props[i];
				var handler = this.propChangeHandlers[prop];
				if(handler)handler(prop);
			}
		}
		if(this.change)this.change();
		
	}
};


// ControlBinder
ControlBinder.bind = function(settings, settingProp, element){
	var name = element.prop("tagName");
	if(name=="INPUT"){
		var prop = null;
		switch(element.attr("type")){
			case "number":
				prop = ControlBinder.numberInputGetter;
				break;
			case "checkbox":
				prop = ControlBinder.checkboxGetter;
				break;
		}
		
		return new ControlBinder(settings, settingProp, element, prop);
		
	}else if(name=="SELECT"){
		return new ControlBinder(settings, settingProp, element);
	}
	throw new Error("Cannot auto-create this binding: "+settingProp);
};
ControlBinder.numberInputGetter = function(element, val){
	if(val === undefined){
		return parseFloat(element.val());
	}else{
		element.val(val);
	}
};
ControlBinder.checkboxGetter = function(element, val){
	if(val === undefined){
		return element.prop('checked');
	}else{
		element.prop('checked', val);
	}
};

function ControlBinder(settings, settingProp, element, prop, event){
	extendAsEventDispatcher(this);
	
	this.settings = settings;
	this.settingProp = settingProp;
	this.element = element;
	this.prop = prop;
	this.event = event || "change";
	this.bind();
	return this;
}
ControlBinder.prototype={
	_ignoreChanges:false,
	bind:function(){
		this.settings.addPropChangeHandler(this.settingProp, closure(this, this.onModelChanged));
		this.element.on(this.event, closure(this, this.onControlChanged));
		
		if(this.settings.hasProp(this.settingProp)){
			this.onModelChanged();
		}else{
			this.onControlChanged();
		}
	},
	onControlChanged:function(e){
		if(this._ignoreChanges)return;
		var val;
		if(this.prop){
			if(typeof(this.prop)=="function"){
				val = this.prop(this.element);
			}else{
				val = this.element.attr(this.prop);
			}
		}else{
			val = this.element.val();
		}
		this._ignoreChanges = true;
		if(val || val===false || val==""){
			this.settings.setProp(this.settingProp, val);
		}else this.settings.clearProp(this.settingProp);
		this._ignoreChanges = false;
	},
	onModelChanged:function(){
		if(this._ignoreChanges)return;
		var val = this.settings.getProp(this.settingProp);
		if(val === undefined)val = null;
		
		if(this.prop){
			if(typeof(this.prop)=="function"){
				this.prop(this.element, val);
			}else{
				this.element.attr(this.prop, val);
			}
		}else{
			this.element.val(val);
		}
		this._ignoreChanges = true;
		this.element.change();
		this._ignoreChanges = false;
	}
};