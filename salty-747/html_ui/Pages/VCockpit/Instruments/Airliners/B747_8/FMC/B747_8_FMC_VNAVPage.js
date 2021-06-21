class B747_8_FMC_VNAVPage {
    
    /* PAGE 1 - VNAV CLIMB - */
    static ShowPage1(fmc) {
        
        /* Climb Page Refresh Timer - Recalculates ECON speed if in use to account for weight change since last refresh */
        fmc.clearDisplay();
        B747_8_FMC_VNAVPage._timer = 0;
        fmc.pageUpdate = () => {
            B747_8_FMC_VNAVPage._timer++;
            if (B747_8_FMC_VNAVPage._timer >= 35) {
                if (SimVar.GetSimVarValue("L:SALTY_VNAV_CLB_MODE" , "Enum") == 0) {
                    fmc.setEconClimbSpeed();
                }
                if (fmc.flightPhaseHasChangedToCruise === true) {
                    fmc.flightPhaseHasChangedToCruise = false;
                    B747_8_FMC_VNAVPage.ShowPage2(fmc);
                }
                else if (fmc.flightPhaseHasChangedToDescent === true) {
                    fmc.flightPhaseHasChangedToDescent = false;
                    B747_8_FMC_VNAVPage.ShowPage3(fmc);
                }
                else {
                    B747_8_FMC_VNAVPage.ShowPage1(fmc);
                }
            }
        };
        
        /* Climb Page Title, 0 - ECON, 1 - MCP SPD, 2 - Fixed CAS, 3 - Fixed Mach, 4 - Envelope Limited */
        let clbPageTitle = "\xa0\xa0\xa0\xa0";
        if (Simplane.getCurrentFlightPhase() === FlightPhase.FLIGHT_PHASE_CLIMB) {
            clbPageTitle = "ACT ";
        }
        let clbSpeedModeCell = "\xa0SEL SPD";
        switch (SimVar.GetSimVarValue("L:SALTY_VNAV_CLB_MODE", "Enum")) {
            case 0:
                clbPageTitle += "ECON CLB";
                clbSpeedModeCell = "\xa0ECON SPD";
                break;
            case 1:
                clbPageTitle += "MCP SPD CLB";
                break;
            case 2:
                clbPageTitle += SimVar.GetSimVarValue("L:SALTY_ECON_CLB_SPEED", "knots").toFixed(0) + "KT CLB";
                break;
            case 3:
                clbPageTitle += "CLB";
                break;
            case 3:
                clbPageTitle += "LIM SPD CLB";
                break;          
        }

        /* LSK 1L  - Cruise Level */
        let crzAltCell = "□□□□□";
        if (fmc.cruiseFlightLevel) {
            crzAltCell = "FL" + fmc.cruiseFlightLevel;
            if (Simplane.getCurrentFlightPhase() === FlightPhase.FLIGHT_PHASE_CLIMB) {
                crzAltCell += "[color]magenta";
            }
        }
        fmc.onLeftInput[0] = () => {
            let value = fmc.inOut;
            fmc.clearUserInput();
            if (fmc.setCruiseFlightLevelAndTemperature(value)) {
                B747_8_FMC_VNAVPage.ShowPage1(fmc);
            }
        };

        /* LSK 2L  - Climb Speed */
        let clbSpeedCell = SimVar.GetSimVarValue("L:SALTY_ECON_CLB_SPEED", "knots").toFixed(0);
        if (Simplane.getAltitude() > 10000 && Simplane.getCurrentFlightPhase() === FlightPhase.FLIGHT_PHASE_CLIMB) {
            clbSpeedCell += "[color]magenta";
        }
        fmc.onLeftInput[1] = () => {
            let value = fmc.inOut;
            if (value === "DELETE" && !SimVar.GetSimVarValue("L:AP_SPEED_INTERVENTION_ACTIVE", "number")) {
                fmc.inOut = "";
                fmc.setEconClimbSpeed();
                B747_8_FMC_VNAVPage.ShowPage1(fmc);
            }
            else {
                value = parseFloat(fmc.inOut);
                fmc.clearUserInput();
                if (150 < value && value < 360) {
                    SimVar.SetSimVarValue("L:SALTY_ECON_CLB_SPEED", "knots", value);
                    SimVar.SetSimVarValue("L:SALTY_VNAV_CLB_MODE" , "Enum", 2);
                    B747_8_FMC_VNAVPage.ShowPage1(fmc);
                }
                else {
                    fmc.showErrorMessage("INVALID ENTRY");
                }
            }
        };

        /* LSK 3L  - Speed Transition */
        let spdTransCell = "---";
        let flapsUPmanueverSpeed = SimVar.GetSimVarValue("L:SALTY_VREF30", "knots") + 80;
        let transSpeed = Math.max(flapsUPmanueverSpeed + 20, 250);
        let spdRestr = SimVar.GetSimVarValue("L:SALTY_SPEED_RESTRICTION", "knots");
        let spdRestrAlt = SimVar.GetSimVarValue("L:SALTY_SPEED_RESTRICTION_ALT", "feet"); 
        if (isFinite(transSpeed)) {
            spdTransCell = transSpeed.toFixed(0);
            if (Simplane.getAltitude() < 10000 && Simplane.getAltitude() > spdRestrAlt && Simplane.getCurrentFlightPhase() === FlightPhase.FLIGHT_PHASE_CLIMB) {
                spdTransCell = "{magenta}" + spdTransCell + "{end}";
            }
            spdTransCell += "/10000";
        }

        /* LSK 3R  - Transition Altitude */
        let transAltCell = "";
        let origin = fmc.flightPlanManager.getOrigin();
        if (origin) {
            if (origin.infos.transitionAltitude) {
                let transitionAltitude = origin.infos.transitionAltitude;
                transAltCell = transitionAltitude.toFixed(0);
            }
        }

        /* LSK 4L  - Speed Restriction */
        let spdRestrCell = "---/-----";
        if (spdRestr !== 0) {
            if (Simplane.getAltitude() < spdRestrAlt && Simplane.getCurrentFlightPhase() === FlightPhase.FLIGHT_PHASE_CLIMB) {
                spdRestrCell = "{magenta}" + parseInt(spdRestr) + "{end}/" + parseInt(spdRestrAlt);
            }
            else {
                spdRestrCell = parseInt(spdRestr) + "/" + parseInt(spdRestrAlt);
            }
        }
        fmc.onLeftInput[3] = () => {
            let value = fmc.inOut;
            if (value === "DELETE") {
                fmc.inOut = ""
                fmc.setSpeedRestriction(0, 0);
                B747_8_FMC_VNAVPage.ShowPage1(fmc);
            }
            else {
                let rSpeed = value.split("/")[0];
                rSpeed = parseInt(rSpeed);
                let rAlt = value.split("/")[1];
                rAlt = parseInt(rAlt);
                if ((rSpeed > 100 && rSpeed < 399) && (rAlt > 0 && rAlt < 45100)) {
                    fmc.setSpeedRestriction(rSpeed, rAlt);
                    fmc.inOut = "";
                    B747_8_FMC_VNAVPage.ShowPage1(fmc);
                }
                else {
                    fmc.showErrorMessage("INVALID ENTRY");
                }
            }
        };    

        /* LSK 4R  - Max Angle */
        let maxAngleCell = (flapsUPmanueverSpeed).toFixed(0);

        /* LSK 5L  - ECON Button */
        let lsk5lCell = "";
        let clbMode = SimVar.GetSimVarValue("L:SALTY_VNAV_CLB_MODE", "Enum");
        if (clbMode !== 0 && crzMode !== 1) [
            lsk5lCell = "<ECON"
        ]
        fmc.onLeftInput[4] = () => {
            if (clbMode !== 0 && crzMode !== 1) {
                fmc.setEconClimbSpeed();
                B747_8_FMC_VNAVPage.ShowPage1(fmc);
            }
        };  

        /* Climb Page Template */
        fmc.setTemplate([
            [clbPageTitle, "1", "3"],
            ["\xa0CRZ ALT"],
            [crzAltCell],
            [clbSpeedModeCell],
            [clbSpeedCell],
            ["\xa0SPD TRANS", "TRANS ALT"],
            [spdTransCell, transAltCell],
            ["\xa0SPD RESTR", "MAX ANGLE"],
            [spdRestrCell, maxAngleCell],
            ["__FMCSEPARATOR"],
            [lsk5lCell, "ENG OUT>"],
            [],
            ["", "CLB DIR>"]
        ]);
        fmc.onNextPage = () => { B747_8_FMC_VNAVPage.ShowPage2(fmc); };
    }

    /* PAGE 2 - VNAV CRUISE - */
    static ShowPage2(fmc) {
        fmc.clearDisplay();
        B747_8_FMC_VNAVPage._timer = 0;
        fmc.pageUpdate = () => {
            B747_8_FMC_VNAVPage._timer++;
            if (B747_8_FMC_VNAVPage._timer >= 35) {
                if (fmc.flightPhaseHasChangedToDescent === true) {
                    fmc.flightPhaseHasChangedToDescent = false;
                    B747_8_FMC_VNAVPage.ShowPage3(fmc);
                }
                else {
                    B747_8_FMC_VNAVPage.ShowPage2(fmc);
                }
            }
        };

        /* Cruise Page Title, 0 - ECON, 1 - LRC, 2 - MCP SPD, 3 - Fixed CAS, 4 - Fixed Mach, 5 - Envelope Limited */
        let crzMode = SimVar.GetSimVarValue("L:SALTY_VNAV_CRZ_MODE", "Enum");
        let crzPageTitle = "\xa0\xa0\xa0\xa0";
        let crzSpeedModeCell = "\xa0SEL SPD";
        if (Simplane.getCurrentFlightPhase() === FlightPhase.FLIGHT_PHASE_CRUISE) {
            crzPageTitle = "ACT ";
        }
        if (SimVar.GetSimVarValue("L:AP_SPEED_INTERVENTION_ACTIVE", "number") == 1) {
            SimVar.SetSimVarValue("L:SALTY_VNAV_CRZ_MODE", "Enum", 2);
        }
        switch (SimVar.GetSimVarValue("L:SALTY_VNAV_CRZ_MODE", "Enum")) {
            case 0:
                crzPageTitle += "ECON CRZ";
                crzSpeedModeCell = "\xa0ECON SPD";
                break;
            case 1:
                crzPageTitle += "LRC CRZ";
                crzSpeedModeCell = "\xa0LRC";
                break;
            case 2:
                crzPageTitle += "MCP SPD CRZ";
                crzSpeedModeCell = "\xa0SEL SPD";
                break;
            case 3:
                crzPageTitle +=  SimVar.GetSimVarValue("L:SALTY_ECON_CRZ_SPEED", "knots").toFixed(0) + "KT CRZ";
                crzSpeedModeCell = "\xa0SEL SPD";
                break;
            case 4:
                let machString = SimVar.GetSimVarValue("L:SALTY_ECON_CRZ_MACH", "mach").toFixed(3);
                crzPageTitle += "M." + machString.slice(2 , 5) + " CRZ";
                crzSpeedModeCell = "\xa0SEL SPD";
                break;
            case 5:
                crzPageTitle += "LIM SPD CRZ";
                crzSpeedModeCell = "\xa0SEL SPD";
                break;          
        }
        let crzSpeedMode = "\xa0ECON SPD"

        /* LSK 1L  - Cruise Alt */
        let crzAltCell = "□□□□□";
        if (fmc.cruiseFlightLevel) {
            crzAltCell = "FL" + fmc.cruiseFlightLevel;
            if (Simplane.getCurrentFlightPhase() === FlightPhase.FLIGHT_PHASE_CRUISE) {
                crzAltCell = "{magenta}FL" + fmc.cruiseFlightLevel + "{end}";
            }
        }  
        fmc.onLeftInput[0] = () => {
            let value = fmc.inOut;
            fmc.clearUserInput();
            if (fmc.setCruiseFlightLevelAndTemperature(value)) {
                B747_8_FMC_VNAVPage.ShowPage2(fmc);
            }
        };

        /* LSK 2L  - Cruise Speed */
        let crzSpeedCell = SimVar.GetSimVarValue("L:SALTY_ECON_CRZ_SPEED", "knots").toFixed(0);
        let machMode = Simplane.getAutoPilotMachModeActive();
        if (machMode) {
            let crzMachNo = Simplane.getAutoPilotMachHoldValue().toFixed(3);
            var radixPos = crzMachNo.indexOf('.');
            crzSpeedCell = crzMachNo.slice(radixPos);
        } else {
            crzSpeedCell = Simplane.getAutoPilotAirspeedHoldValue().toFixed(0);
        }
        if (Simplane.getCurrentFlightPhase() === FlightPhase.FLIGHT_PHASE_CRUISE) {
            crzSpeedCell += "[color]magenta";
        }
        fmc.onLeftInput[1] = () => {
            let value = fmc.inOut;
            if (crzMode === 2) {
                fmc.showErrorMessage("INVALID ENTRY");
            }
            else if (value === "DELETE" && !SimVar.GetSimVarValue("L:AP_SPEED_INTERVENTION_ACTIVE", "number")) {
                fmc.inOut = "";
                fmc.setEconCruiseSpeed();
                B747_8_FMC_VNAVPage.ShowPage2(fmc);
            }
            else {
                fmc.clearUserInput();
                if (value.charAt(0) == ".") {
                    value = value.substring(0);
                    value = parseFloat(value);
                    let speedFromMach = SimVar.GetGameVarValue("FROM MACH TO KIAS", "number", value);
                    SimVar.SetSimVarValue("L:SALTY_ECON_CRZ_MACH", "mach", value);
                    SimVar.SetSimVarValue("L:SALTY_ECON_CRZ_SPEED", "knots", speedFromMach);
                    SimVar.SetSimVarValue("L:SALTY_VNAV_CRZ_MODE" , "Enum", 4);
                    fmc.managedMachOn();
                }
                else if (150 < value && value < 360) {
                    value = parseFloat(value);
                    SimVar.SetSimVarValue("L:SALTY_ECON_CRZ_SPEED", "knots", value);
                    SimVar.SetSimVarValue("L:SALTY_VNAV_CRZ_MODE" , "Enum", 3);
                    fmc.managedMachOff();
                }
                else {
                    fmc.showErrorMessage("INVALID ENTRY");
                }
            }
        };

        /* LSK 3L  - N1 */
        let n1Cell = "--%";
        let n1Value = fmc.getThrustClimbLimit();
        if (isFinite(n1Value)) {
            n1Cell = n1Value.toFixed(1) + "%";
        }

        /* Calculates Maximum Flight level - uses linear regression derived formula from actual aircraft data */
        let currentWeight = SimVar.GetSimVarValue("TOTAL WEIGHT", "pounds");
        let weightLimitedFltLevel = (((-0.02809 * currentWeight) + 56571.91142) / 100);
        let maxFltLevel = Math.min(431, weightLimitedFltLevel);
        
        /* LSK 5L  - ECON Button */
        let lsk5lCell = "";

        if (crzMode !== 0 && crzMode !== 2) [
            lsk5lCell = "<ECON"
        ]
        fmc.onLeftInput[4] = () => {
            if (crzMode !== 0 && crzMode !== 2) {
                fmc.setEconCruiseSpeed();
                B747_8_FMC_VNAVPage.ShowPage2(fmc);
            }
        };  

        /* Cruise Page Template */
        fmc.setTemplate([
            [crzPageTitle, "2", "3"],
            ["\xa0CRZ ALT", "STEP TO"],
            [crzAltCell],
            [crzSpeedModeCell, "AT"],
            [crzSpeedCell],
            ["\xa0N1"],
            [n1Cell],
            ["\xa0STEP", "RECMD", "OPT\xa0\xa0\xa0MAX"],
            ["RVSM", "", "\xa0\xa0\xa0\xa0\xa0\xa0" + "FL" + maxFltLevel.toFixed(0)],
            ["__FMCSEPARATOR"],
            [lsk5lCell, "ENG OUT>"],
            [],
            ["<RTA PROGRESS", "LRC>"]
        ]);
        fmc.onPrevPage = () => { B747_8_FMC_VNAVPage.ShowPage1(fmc); };
        fmc.onNextPage = () => { B747_8_FMC_VNAVPage.ShowPage3(fmc); };
    }
    static ShowPage3(fmc) {
        fmc.clearDisplay();
        B747_8_FMC_VNAVPage._timer = 0;
        fmc.pageUpdate = () => {
            B747_8_FMC_VNAVPage._timer++;
            if (B747_8_FMC_VNAVPage._timer >= 100) {
                B747_8_FMC_VNAVPage.ShowPage3(fmc);
            }
        };
        let speedTransCell = "---";
        let speed = fmc.getDesManagedSpeed();
        if (isFinite(speed)) {
            speedTransCell = speed.toFixed(0);
        }
        speedTransCell += "/10000";
        fmc.setTemplate([
            ["DES", "3", "3"],
            ["E/D AT"],
            [],
            ["ECON SPD"],
            [],
            ["SPD TRANS", "WPT/ALT"],
            [speedTransCell],
            ["SPD RESTR"],
            [],
            ["PAUSE @ DIST FROM DEST"],
            ["OFF", "FORECAST>"],
            [],
            ["\<OFFPATH DES"]
        ]);
        fmc.onPrevPage = () => { B747_8_FMC_VNAVPage.ShowPage2(fmc); };
    }
}
//# sourceMappingURL=B747_8_FMC_VNAVPage.js.map