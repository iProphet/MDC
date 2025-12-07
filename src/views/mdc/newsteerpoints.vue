<script setup lang="ts">
import { inject, computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { usePackageStore } from "@/controller/stores/packageStore";

import {
  calculateHeading,
  calculateDistance,
  toLatString,
  toLongString,
} from "@/controller/utils/utilFunctions";
import { useFlightStore } from "@/controller/stores/flightStore";

const { getFlight } = storeToRefs(useFlightStore());
const { selectedPKG } = storeToRefs(usePackageStore());
const { pagenr } = defineProps({
  pagenr: {
    required: true,
    type: Number,
  },
});

const waypointsArray = computed(() => {
  return new Array(26)
    .fill("")
    .map((_n, i) =>
      getFlight.value.waypoints.find((n) => n.waypointNr == i + 1)
    );
});

const hhmmss = (time: string) => {
  if (!time) return "";
  const date = new Date(time);
  return `${date.toLocaleTimeString()}`;
};

const getBullseyeName = (index: number) => {
  selectedPKG.value.bullseyes.at(Number(selectedPKG.value.selectedBullseye))
    ?.name;
};
const getBullseyeLocation = (index: number) => {
  const bullz = selectedPKG.value.bullseyes.at(
    Number(selectedPKG.value.selectedBullseye)
  );

  return bullz?.location.lat + " " + bullz?.location.lon;
};

const toLatLongString = (lat: number, long: number) => {
  if (lat && long) return toLatString(lat) + " / " + toLongString(long);
  return "";
};

const fuelRange = 10;
const fuelEndurance = 4400;

const calculateMinimumFuel = (steerpoint: number): string => {
  let routeFuel = 1200;
  const landingIndex = getFlight.value.waypoints.findIndex((n) =>
    n.type.includes("Landing")
  );
  if (landingIndex !== -1) {
    for (let i = steerpoint; i <= landingIndex; i++) {
      const distance = calculateDistance(
        getFlight.value.waypoints[i - 1]?.location.lat,
        getFlight.value.waypoints[i - 1]?.location.lon,
        getFlight.value.waypoints[i]?.location.lat,
        getFlight.value.waypoints[i]?.location.lon
      );
      routeFuel += fuelRange * parseFloat(distance);
      if (i !== 1) {
        const activity = getFlight.value.waypoints[i - 1].activity;
        const hours = parseInt(activity.substring(0, 2));
        const minutes = parseInt(activity.substring(3, 5));
        const seconds = parseInt(activity.substring(6, 8));
        routeFuel += (seconds / 60 / 60 + minutes / 60 + hours) * fuelEndurance;
      }
    }
  }
  return routeFuel.toFixed(0);
};

const calculateTakeoffTime = (
  takeoffTimeStr: string,
  activityStr: string
): string => {
  if (!activityStr || !activityStr) return "";
  const takeoffTime = takeoffTimeStr.split(":").map(Number);
  const activity = activityStr.split(":").map(Number);
  if (!takeoffTime || !activity) return "";

  const hour = takeoffTime[0] + activity[0];
  const minute = takeoffTime[1] + activity[1];
  const second = takeoffTime[2] + activity[2];

  let newHour = hour;
  let newMinute = minute;
  let newSecond = second;

  if (newSecond >= 60) {
    newMinute += Math.floor(newSecond / 60);
    newSecond %= 60;
  }
  if (newMinute >= 60) {
    newHour += Math.floor(newMinute / 60);
    newMinute %= 60;
  }
  if (newHour >= 24) {
    newHour %= 24;
  }

  return `${newHour.toString().padStart(2, "0")}:${newMinute
    .toString()
    .padStart(2, "0")}:${newSecond.toString().padStart(2, "0")}`;
};

const showROE = inject("showROE");
</script>

<template>
  <div class="mdcpage bdr ctr" id="mdcpage" name="mdcpage">
    <div class="c36 r bdr ctr">
      RED BOXED CELLS SECRET WHEN COMPLETE - SHRED AFTER USE
    </div>
    <div class="c3 y bdr ctr">PAGE {{ pagenr }}</div>
    <div class="c33 g bdr ctr">STEERPOINTS</div>

    <div class="c2 g bdr ctr">SP</div>
    <div class="c5 g bdr ctr">NAME</div>
    <div class="c3 g bdr ctr">TOS</div>
    <div class="c4 g bdr ctr">HDG / DIST</div>
    <div class="c3 g bdr ctr">GS / M</div>
    <div class="c3 g bdr ctr">ALT</div>
    <div class="c3 g bdr ctr">>FUEL</div>
    <div class="c9 g bdr ctr">LAT / LONG</div>
    <div class="c4 g bdr ctr">ACTIVITY</div>

    <div class="c36 child" v-for="index in new Array(25).keys()">
      <div class="c2 g bdr ctr">{{ index + 1 }}</div>
      <div :class="`c5 ${index % 2 ? 'hg' : 'w'}  bdr ctr`">
        {{
          waypointsArray.at(index)?.hideOnMDC
            ? ""
            : waypointsArray.at(index)?.type === "STP"
              ? waypointsArray.at(index)?.name
              : waypointsArray.at(index)?.type
        }}
      </div>
      <div :class="`c3 ${index % 2 ? 'hg' : 'w'}  bdr ctr`">
        {{
          !waypointsArray.at(index) || waypointsArray.at(index)?.hideOnMDC
            ? ""
            : index === 0
              ? calculateTakeoffTime(
                hhmmss(waypointsArray.at(index)!.tot),
                waypointsArray.at(index)!.activity
              )
              : hhmmss(waypointsArray.at(index)!.tot)
        }}
      </div>
      <div :class="`c4 ${index % 2 ? 'hg' : 'w'}  bdr ctr font-stretch-95%`">
        {{
          waypointsArray.at(index)?.hideOnMDC
            ? ""
            : waypointsArray.at(index)?.location.lat &&
              waypointsArray.at(index - 1)?.location.lon
              ? calculateHeading(
                waypointsArray.at(index - 1)!.location.lat,
                waypointsArray.at(index - 1)!.location.lon,
                waypointsArray.at(index)!.location.lat,
                waypointsArray.at(index)!.location.lon
              )
                .toFixed(0)
                .padStart(3, "0") +
              "°M / " +
              parseInt(
                calculateDistance(
                  waypointsArray.at(index - 1)!.location.lat,
                  waypointsArray.at(index - 1)!.location.lon,
                  waypointsArray.at(index)!.location.lat,
                  waypointsArray.at(index)!.location.lon
                )
              ) +
              "nm"
              : ""
        }}
      </div>
      <div :class="`c3 ${index % 2 ? 'hg' : 'w'}  bdr ctr`">
        {{
          waypointsArray.at(index)?.hideOnMDC
            ? ""
            : index !== 0
              ? waypointsArray.at(index)?.groundspeed !== undefined
                ? waypointsArray.at(index)?.groundspeed?.toFixed(0) +
                " / " +
                waypointsArray.at(index)?.mach?.toFixed(2).replace("0.", ".")
                : ""
              : ""
        }}
      </div>
      <div :class="`c3 ${index % 2 ? 'hg' : 'w'}  bdr ctr`">
        {{
          waypointsArray.at(index)?.hideOnMDC
            ? ""
            : waypointsArray.at(index)?.location.elevation
              ? waypointsArray
                .at(index)
                ?.location.elevation?.toLocaleString("en-EN") + " ft"
              : ""
        }}
      </div>
      <div :class="`c3 ${index % 2 ? 'hg' : 'w'}  bdr ctr`">
        {{
          waypointsArray.at(index)?.hideOnMDC
            ? ""
            : waypointsArray.at(index)
              ? parseInt(calculateMinimumFuel(index + 1)).toLocaleString("en-EN")
              : ""
        }}
      </div>
      <div :class="`c9 hr  bdr ctr`">
        {{
          waypointsArray.at(index)?.hideOnMDC
            ? ""
            : waypointsArray.at(index)?.location.lat !== undefined
              ? toLatString(waypointsArray.at(index)!.location.lat) +
              " / " +
              toLongString(waypointsArray.at(index)!.location.lon)
              : ""
        }}
      </div>
      <div :class="`c4 ${index % 2 ? 'hg' : 'w'}  bdr ctr`">
        {{
          waypointsArray.at(index)?.hideOnMDC
            ? ""
            : waypointsArray.at(index)?.activity !== "00:00:00"
              ? index !== 0
                ? waypointsArray.at(index)?.activity
                : ""
              : ""
        }}
      </div>
    </div>

    <div class="c36 g bdr ctr">OPEN STEERPOINTS</div>

    <div class="c2 g bdr ctr">SP</div>
    <div class="c3 g bdr ctr">TYPE</div>
    <div class="c5 g bdr ctr">NAME</div>
    <div class="c9 g bdr ctr">LAT / LONG</div>
    <div class="c3 g bdr ctr">ELEV</div>
    <div class="c14 g bdr ctr">NOTES</div>

    <div class="c36 child" v-for="index in new Array(16).keys()">
      <div class="c2 g bdr ctr">{{ index + 81 }}</div>
      <div :class="`c3 ${index + 81 < 97 ? (index % 2 ? 'hg' : 'w') : 'g'
        } bdr ctr`">
        {{ index + 81 < 97 ? getFlight.dmpis[index]?.type : "BULLS" }} </div>
          <div :class="`c5 ${index % 2 ? 'hg' : 'w'} bdr ctr`">
            {{
              index + 81 < 97 ? getFlight.dmpis[index]?.name : getBullseyeName(index - 16) }} </div>
              <div :class="`c9 hr bdr ctr`">
                {{
                  index + 81 < 97 ? toLatLongString(getFlight.dmpis[index]?.location.lat,
                    getFlight.dmpis[index]?.location.lon) : getBullseyeLocation(index - 16) }} </div>
                  <div :class="`c3 ${index + 81 < 97 ? (index % 2 ? 'hg' : 'w') : 'g'
                    } bdr ctr`">
                    {{ index + 81 < 97 ? getFlight.dmpis[index]?.location.elevation : "" }} </div>
                      <div :class="`c14 nobdr ${index % 2 ? 'hg' : 'w'} bdr ctr`">
                        {{ getFlight.dmpis[index]?.note }}
                      </div>
                  </div>
                  <div class="c36 child" v-for="index in new Array(3).keys()">
                    <div class="c2 g bdr ctr">
                      {{
                        selectedPKG.bullseyes[index] ? selectedPKG.bullseyes[index].wp : ""
                      }}
                    </div>
                    <div class="c3 g bdr ctr">BULLS</div>
                    <div :class="`c5 ${index % 2 ? 'hg' : 'w'} bdr ctr`">
                      {{
                        selectedPKG.bullseyes[index] ? selectedPKG.bullseyes[index].name : ""
                      }}
                    </div>
                    <div :class="`c9 hr bdr ctr`">
                      {{
                        selectedPKG.bullseyes[index]
                          ? selectedPKG.bullseyes[index].location.toLatString() + " / "
                          : ""
                      }}

                      {{
                        selectedPKG.bullseyes[index]
                          ? selectedPKG.bullseyes[index].location.toLongString()
                          : ""
                      }}
                    </div>
                    <div class="c3 hg bdr ctr"></div>
                    <div :class="`c14 nobdr ${index % 2 ? 'hg' : 'w'} bdr ctr`">
                      {{
                        selectedPKG.bullseyes[index] ? selectedPKG.bullseyes[index].note : ""
                      }}
                    </div>
                  </div>

                  <div class="c36 r bdr ctr">
                    RED BOXED CELLS SECRET WHEN COMPLETE - SHRED AFTER USE
                  </div>
              </div>
</template>
<style scoped>
@import "@/assets/styles/mdc.css";

.font500 {
  font-weight: 500;
}
</style>
