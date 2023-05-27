/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable no-await-in-loop */
import { useLocation, useNavigate } from "react-router-dom";
import React, { useState, useEffect, ChangeEvent } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";

import Empty from "@src/common/Empty";
import { GoalItem } from "@src/models/GoalItem";
import { ILocationProps } from "@src/Interfaces/IPages";
import { getActiveSharedWMGoals } from "@src/api/SharedWMAPI";
import { getActiveGoals, getGoal } from "@api/GoalsAPI";
import { createGoalObjectFromTags } from "@src/helpers/GoalProcessor";
import {
  displayAddGoal,
  displayChangesModal,
  displayGoalId,
  displayShareModal,
  displaySuggestionsModal,
  displayUpdateGoal,
  goalsHistory,
  popFromGoalsHistory } from "@src/store/GoalsState";
import MyGoal from "@components/GoalsComponents/MyGoal";
import AppLayout from "@src/layouts/AppLayout";
import GoalsList from "@components/GoalsComponents/GoalsList";
import ZAccordion from "@src/common/Accordion";
import ConfigGoal from "@components/GoalsComponents/GoalConfigModal/ConfigGoal";
import DisplayChangesModal from "@components/GoalsComponents/DisplayChangesModal/DisplayChangesModal";
import { GoalSublist } from "@components/GoalsComponents/GoalSublistPage/GoalSublistPage";
import { darkModeState, displayInbox, displayToast, lastAction, searchActive } from "@src/store";

import "./MyGoalsPage.scss";

export const MyGoalsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isUpdgradeAvailable = localStorage.getItem("updateAvailable") === "true";
  let debounceTimeout: ReturnType<typeof setTimeout>;

  const [loading, setLoading] = useState(false);
  const [activeGoals, setActiveGoals] = useState<GoalItem[]>([]);
  const [doneGoals, setDoneGoals] = useState<GoalItem[]>([]);
  const [showActions, setShowActions] = useState({ open: "root", click: 1 });
  const showAddGoal = useRecoilValue(displayAddGoal);
  const darkModeStatus = useRecoilValue(darkModeState);
  const showShareModal = useRecoilValue(displayShareModal);
  const showUpdateGoal = useRecoilValue(displayUpdateGoal);
  const showChangesModal = useRecoilValue(displayChangesModal);
  const showSuggestionModal = useRecoilValue(displaySuggestionsModal);

  const setShowToast = useSetRecoilState(displayToast);
  const setShowSuggestionsModal = useSetRecoilState(displaySuggestionsModal);

  const setSubGoalHistory = useSetRecoilState(goalsHistory);
  const popFromHistory = useSetRecoilState(popFromGoalsHistory);

  const [action, setLastAction] = useRecoilState(lastAction);
  const [openInbox, setOpenInbox] = useRecoilState(displayInbox);
  const [displaySearch, setDisplaySearch] = useRecoilState(searchActive);
  const [selectedGoalId, setSelectedGoalId] = useRecoilState(displayGoalId);

  const handleUserGoals = (goals: GoalItem[]) => {
    setActiveGoals([...goals.filter((goal) => goal.archived === "false")]);
    setDoneGoals([...goals.filter((goal) => goal.archived === "true" && goal.typeOfGoal === "myGoal")]);
  };
  const refreshActiveGoals = async () => {
    const goals: GoalItem[] = openInbox ? await getActiveSharedWMGoals() : await getActiveGoals("true");
    handleUserGoals(goals);
  };
  const search = async (text: string) => {
    const goals: GoalItem[] = openInbox ? await getActiveSharedWMGoals() : await getActiveGoals("true");
    handleUserGoals(goals.filter((goal) => goal.title.toUpperCase().includes(text.toUpperCase())));
  };
  const debounceSearch = (event: ChangeEvent<HTMLInputElement>) => {
    if (debounceTimeout) { clearTimeout(debounceTimeout); }
    debounceTimeout = setTimeout(() => { search(event.target.value); }, 300);
  };

  const handleBackClick = () => {
    if (!showAddGoal && !showUpdateGoal) {
      navigate(-1);
    } else { popFromHistory(-1); }
  };

  useEffect(() => {
    if (action !== "none") {
      setLastAction("none");
      refreshActiveGoals();
    }
  }, [action]);
  useEffect(() => {
    refreshActiveGoals();
  }, [showShareModal, openInbox, showAddGoal, showChangesModal, showUpdateGoal, showSuggestionModal, showChangesModal]);
  useEffect(() => {
    if (selectedGoalId === "root") { refreshActiveGoals(); }
  }, [selectedGoalId, displaySearch]);

  /* Usefull if navigation is from MyTimePage or external page/component */
  useEffect(() => {
    (async () => {
      const state = location.state as ILocationProps | null | undefined;
      if (state) {
        const { isRootGoal } = state;
        let { openGoalOfId } = state;
        if (!isRootGoal && openGoalOfId) {
          const tmpHistory = [];
          while (openGoalOfId !== "root") {
            const tmpGoal: GoalItem = await getGoal(openGoalOfId);
            tmpHistory.push(({
              goalID: tmpGoal.id || "root",
              goalColor: tmpGoal.goalColor || "#ffffff",
              goalTitle: tmpGoal.title || "",
              display: null
            }));
            openGoalOfId = tmpGoal.parentGoalId;
          }
          tmpHistory.reverse();
          setSubGoalHistory([...tmpHistory]);
          setSelectedGoalId(state.openGoalOfId);
        }
        location.state = null;
      }
    })();
  });

  return (
    <AppLayout title="My Goals" debounceSearch={debounceSearch}>
      <div className="myGoals-container">
        {
          selectedGoalId === "root" ? (
            <div className="my-goals-content">
              { showAddGoal && (<ConfigGoal action="Create" goal={createGoalObjectFromTags({})} />)}
              <div>
                { openInbox && isUpdgradeAvailable && (
                  <ZAccordion
                    showCount={false}
                    style={{
                      border: "none",
                      background: darkModeStatus ? "var(--secondary-background)" : "transparent"
                    }}
                    panels={[{ header: "Notifications",
                      body: (
                        <div className={`notification-item user-goal${darkModeStatus ? "-dark" : ""}`}>
                          <p>Upgrade Available !!</p>
                          <button
                            type="button"
                            onClick={async () => {
                              navigator.serviceWorker.register("../../service-worker.js")
                                .then((registration) => {
                                  if (registration.waiting) {
                                    registration.waiting?.postMessage({ type: "SKIP_WAITING" });
                                    localStorage.setItem("updateAvailable", "false");
                                    window.location.reload();
                                  }
                                });
                            }}
                            className={`default-btn${darkModeStatus ? "-dark" : ""}`}
                          >Upgrade Now
                          </button>
                        </div>
                      ) }]}
                  />
                )}
                { openInbox && !isUpdgradeAvailable && activeGoals.length === 0 && <Empty /> }
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <GoalsList
                    goals={activeGoals}
                    showActions={showActions}
                    setShowActions={setShowActions}
                    setGoals={setActiveGoals}
                  />
                </div>
                <div className="archived-drawer">
                  { doneGoals.length > 0 && (
                    <ZAccordion
                      showCount
                      style={{
                        border: "none",
                        background: darkModeStatus ? "var(--secondary-background)" : "transparent"
                      }}
                      panels={[{
                        header: "Done",
                        body: doneGoals.map((goal: GoalItem) => (
                          <MyGoal
                            key={`goal-${goal.id}`}
                            goal={goal}
                            showActions={showActions}
                            setShowActions={setShowActions}
                          />
                        ))
                      }]}
                    />
                  )}
                </div>
              </div>
            </div>
          )
            :
            (<GoalSublist />)
        }
        { showChangesModal && <DisplayChangesModal /> }
      </div>
    </AppLayout>
  );
};
