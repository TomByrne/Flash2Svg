(function(dx){
	function ExtensibleStroke(stroke){
		dx.Object.apply(this,[stroke]);
		if(this.shapeFill && !(this.shapeFill instanceof dx.Fill)){
			this.shapeFill=new dx.Fill(this.shapeFill);
		}else if(this.shapeFill){
			this.shapeFill=this.shapeFill;
		}
		return this;
	}
	ExtensibleStroke.prototype={
		__proto__:dx.Object.prototype,
		$:Object,
		type:ExtensibleStroke,
		//methods
		is:function(s){
			for(var property in this){
				if(property!='shapeFill' && property!='color'){
					if(this[property]!=s[property]){return false;}
				}
			}
			if(this.shapeFill){
				if(!this.shapeFill.is(s.shapeFill)){return false;}
			}else{
				if(this.color!=s.color){return false;}
			}
			return true;
		}

	}
	dx.extend({Stroke:ExtensibleStroke});
})(dx)
