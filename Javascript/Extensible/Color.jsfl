(function(ext){
	/**
	 * @classDescription A utility class for translating and manipulating colors and color effects.
	 * Can take as parameters a hex string ( with or without alpha ), a symbol instance, a contour, a 
	 * shape ( it will use the first fill in the shape ), a fill, or up to 4 Numbers representing red, green,
	 * blue, and alpha values from 0 to 255.
	 * @param {
	 * 		Fill,
	 * 		Shape,
	 * 		Contour,
	 * 		Number,
	 * 		String,
	 * 		SymbolInstance,
	 * 		ASElement, 
	 * 		extensible.Fill,
	 * 		extensible.Shape,
	 * 		extensible.Contour,
	 * 		extensible.Number,
	 * 		extensible.String,
	 * 		extensible.SymbolInstance,
	 * 		extensible.TLFText
	 * } value
	 * @constructor
	 */
	function Color(value){
		var args=Array.prototype.slice.call(arguments);
		this.amount=new ext.Array([0,0,0,0]);
		this.percent=new ext.Array([100,100,100,100]);
		if(args.length==1 && typeof(args[0])!='number'){
			if(args[0] instanceof Element){
				args=new ext.Selection(args);
			}
			if(typeof args[0]=='string'){
				this.hex=args[0];
			}else if(args[0] instanceof this.type){
				ext.Object.apply(this,args);
			}else if(args[0] instanceof ext.Contour){
				this.hex=args[0].fill.color;
			}else if(args[0] instanceof ext.Fill){
				this.hex=args[0].color;
			}else if(args[0] instanceof ext.Element){
				if(args[0] instanceof ext.Shape){
					this.hex=args[0].contours[0].fill.color;
				}else if(args[0] instanceof ext.SymbolInstance){
					var rgba=[
						'colorRedAmount',
						'colorGreenAmount',
						'colorBlueAmount',
						'colorAlphaAmount'
					];
					var rgbaX=[
						'colorRedPercent',
						'colorGreenPercent',
						'colorBluePercent',
						'colorAlphaPercent'
					];
					
					for(var n=0;n<4;n++){
						this.amount[n]=args[0][rgba[n]];
					}
					for(var n=0;n<4;n++){
						this.percent[n]=args[0][rgbaX[n]];
					}
					
				}
			}
		}else{
			for(var i=0;i<args.length;i++){
				this.amount[i]=Number(args[i]);
			}
			this.percent=new ext.Array([100,100,100,100]);
		}
		return this;
	};
	Color.prototype={
		__proto__:ext.Object.prototype,
		type:Color,
		get output(){
			return [
				Math.max(Math.min(this.amount[0]*(this.percent[0]/100),255),0),
				Math.max(Math.min(this.amount[1]*(this.percent[1]/100),255),0),
				Math.max(Math.min(this.amount[2]*(this.percent[2]/100),255),0),
				Math.max(Math.min(this.amount[3]*(this.percent[3]/100),255),0)
			];
		},
		set output(){},
		set hex(hstring){
			var hexDigit=['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];
			if(hstring[0]=="#") hstring=hstring.slice(1);
			this.amount.clear();
			for(var i=0;i<hstring.length;i+=2){
				this.amount.push(
					hexDigit.indexOf(
						hstring[i].toUpperCase()
					)
					*16.0
					+hexDigit.indexOf(
						hstring[i+1].toUpperCase()
					)
				);
			}
			this.percent=new ext.Array([
				100,100,100,100
			]);
			while(this.amount.length<4){
				this.amount.push(255);
			}
			return this;
		},
		get hex(){
			return this.getHex();
		},
		getHex:function(alpha){
			alpha=alpha||false;
			var c=this.output;
			for(var i=0;i<c.length;i++){
				c[i]=Math.min(c[i],255);
				c[i]=Math.max(c[i],0);
			}
			var hexDigit=['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];
			var hex=["#"];
			for(var i=0;i<c.length-(alpha?0:1);i++){
				var indexA=Math.floor((c[i])/16.0);
				var indexB=Math.floor(c[i]-(16.0*indexA));
				hex.push(hexDigit[indexA]);
				hex.push(hexDigit[indexB]);
				
			}
			return hex.join('');
		},
		set red(value){
			this.amount[0]=value;
			this.percent[0]=100;
		},
		get red(){
			return this.output[0];
		},
		set green(value){
			this.amount[1]=value;
			this.percent[1]=100;
		},
		get green(){
			return this.output[1];
		},
		set blue(value){
			this.amount[2]=value;
			this.percent[2]=100;
		},
		get blue(){
			return this.output[2];
		},
		set alpha(value){
			this.amount[3]=value;
			this.percent[3]=100;
		},
		get alpha(){
			return this.output[3];
		},
		set r(value){
			this.red=value;
		},
		get r(){
			return this.red;
		},
		set g(value){
			this.green=value;
		},
		get g(){
			return this.green;
		},
		set b(value){
			this.blue=value;
		},
		get b(){
			return this.blue;
		},
		set a(value){
			this.alpha=value;
		},
		get a(){
			return this.alpha;
		},
		get opacity(){
			return this.output[3]/255.0;
		},
		set opacity(value){
			this.amount[3]=value*255.0;
			this.percent[3]=100;
		},
		transform:function(color){
			color=new this.type(color);
			if(this.percent[0]){
				color.amount[0]+=this.amount[0]/(this.percent[0]/100);
				color.percent[0]*=this.percent[0]/100;
			}else{
				color.amount[0]=this.amount[0];
			}
			if(this.percent[1]){
				color.amount[1]+=this.amount[1]/(this.percent[1]/100);
				color.percent[1]*=this.percent[1]/100;
			}else{
				color.amount[1]=this.amount[1];
			}
			if(this.percent[2]){
				color.amount[2]+=this.amount[2]/(this.percent[2]/100);
				color.percent[2]*=this.percent[2]/100;
			}else{
				color.amount[2]=this.amount[2];
			}
			if(this.percent[3]){
				color.amount[3]+=this.amount[3]/(this.percent[3]/100);
				color.percent[3]*=this.percent[3]/100;
			}else{
				color.amount[3]=this.amount[3];
			}
			/*for(var i=0;i<4;i++){
				color.amount[i]=Math.min(color.amount[i],255);
				color.amount[i]=Math.max(color.amount[i],0);
			}*/
			return color;
		},
		get idString(){
			var str='';
			if(!this.amount.is([0,0,0,0])){
				for(var i=0;i<this.amount.length;i++){
					var s=String(this.amount[i]);
					while(s.length<3){s='0'+s;}
					str+=s;
				}
			}
			if(!this.percent.is([100,100,100,100])){
				str+='x';
				for(var i=0;i<this.percent.length;i++){
					s=String(this.percent[i]);
					while(s.length<3){s='0'+s;}
					str+=s;
				}
			}
			return str; 
		},
		set idString(){},
		toString:function(){
			return this.getHex(true);	
		}
	};
	ext.extend({
		Color:Color
	});
})(extensible)
