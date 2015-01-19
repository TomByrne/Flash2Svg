package{
	import adobe.utils.MMEndCommand;
	import adobe.utils.MMExecute;


	public class Fl{

		
		public static function alert(msg:String):void{
			MMExecute("alert(unescape('"+escape(msg)+"'))");
		}
		public static function confirm(msg:String):Boolean{
			return MMExecute("confirm(unescape('"+escape(msg)+"'))")=="true";
		}

		public static function log(... params):void{
			trace.apply(null, params);
			MMExecute("fl.trace(unescape('"+escape(params.join(" "))+"'))");
		}
	}

}