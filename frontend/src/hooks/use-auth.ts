import {useContext} from "react";
import {AuthContext} from "@/contexts";
import type {ExtendedAuthContextType} from "@/types";

/**
 * Utility function useAuth.
 */
export const useAuth = ():ExtendedAuthContextType => {
	const context = useContext(AuthContext);
	
	if(!context){
		throw new Error("useAuth must be used within an AuthProvider");
	}
	
	return context;
};
