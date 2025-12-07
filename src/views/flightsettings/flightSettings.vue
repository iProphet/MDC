<script setup lang="ts">
import { flights } from "@/config/defaults/flights";
import { rnlaf313members } from "@/config/defaults/member";
import { useFlightStore } from "@/controller/stores/flightStore";
import { usePackageStore } from "@/controller/stores/packageStore";
import { storeToRefs } from "pinia";
import { computed, ref, watch, type Ref } from "vue";
import { useGlobalStore } from "@/controller/stores/theatreStore";

import SelectFlight from "@/components/PackageFlightSelection/SelectFlight.vue";
import { getSTN } from "@/controller/utils/utilFunctions";

import toDTC from "@/components/DTCExports/commsToDTC.vue";
import { commTables, tacticalFreqs } from "@/config/defaults/frequencies";
import { airports, airfieldEmpty } from "@/config/defaults/airfields";
import type { WritableComputedRef } from "vue";
import type { Coordinate } from "@/controller/utils/coordinates";

/**
 * Misc
 */
const enableBullz = ref(true);

const packageStore = usePackageStore();
const { packages, selectedPKG } = storeToRefs(packageStore);
const useDefaults = ref(true);

const flightStore = useFlightStore();
const { getFlight } = storeToRefs(flightStore);
const { file, stateChanged, theatre, time } = storeToRefs(useGlobalStore());

function callsignChangeEvent(event: any) {
  if (event.value.callsign) {
    getFlight.value.callsign = event.value.callsign;
    getFlight.value.callsignNumber = event.value.callsignNumber;
    getFlight.value.aircrafttype = event.value.type;
  }
  flightStore.updateFligh();
}

// @ts-ignore
const tanker: WritableComputedRef<
  | {
      name: string;
      freq: string;
      type: string;
      activity: string;
      tacan: string;
      location: Coordinate;
    }
  | undefined
> = computed({
  get() {
    return selectedPKG.value.agencies.find(
      (n) =>
        getFlight.value.comms.radio1[12].freq === n.freq ||
        getFlight.value.comms.radio2[12].freq === n.freq
    );
  },

  set(value) {
    if (!value) return;
    const assignTo = parseFloat(value.freq) > 200 ? "radio1" : "radio2";

    getFlight.value.comms[assignTo][12] = {
      description: value.name + " / " + value.tacan,
      freq: value.freq,
      name:
        Object.entries(commTables[0]).find(([name, freqs]) =>
          freqs.find((freq: string) => freq === value!.freq)
        )?.[0] || "",
      number:
        (Object.entries(commTables[0])
          .find(([name, freqs]) =>
            freqs.find((freq: string) => freq === value!.freq)
          )?.[1]
          .map((el) => el + "")
          .indexOf(value?.freq) || 0) + 1,
    };
  },
});

function tacaninput() {
  if (!useDefaults.value) return;

  const match = getFlight.value.units[0].tacan.match(/(\d{1,2})([YX])/);
  if (match && match[2]) {
    if (getFlight.value.units[1])
      getFlight.value.units[1].tacan =
        ((parseInt(match[1]) + 63) % 126) + match[2];
    if (getFlight.value.units[2])
      getFlight.value.units[2].tacan =
        ((parseInt(match[1]) + 63) % 126) + (match[2] === "Y" ? "X" : "Y");
    if (getFlight.value.units[3])
      getFlight.value.units[3].tacan =
        parseInt(match[1]) + "" + (match[2] === "Y" ? "X" : "Y");
  }
}

function clearComms(index: number, radio: "pri" | "sec") {
  if (radio === "pri")
    getFlight.value.comms.radio1[index] = {
      description: "",
      freq: "",
      name: "",
    };
  else {
    getFlight.value.comms.radio2[index] = {
      description: "",
      freq: "",
      name: "",
    };
  }
}

const selectedFreqs = computed(() => {
  return {
    checkVHF: getFlight.value.comms.radio2[4],
    checkUHF: getFlight.value.comms.radio1[4],
    tactVHF: getFlight.value.comms.radio2[5],
    tactUHF: getFlight.value.comms.radio1[5],
  };
});

function flightMemberUpdate() {
  getFlight.value.units.forEach((unit) => {
    if (!unit.callsign) return;
    if (unit.callsign.length < 3) return;
    const args = rnlaf313members.find((n) =>
      n.callsign.includes(unit.callsign)
    );
    if (args) {
      unit.tailNr = args.tailnr;
    }
  }); // corrects TACAN assignment
  tacaninput();
}

const isCustomCalsign = ref(false);

const addFlightMemeber = () => {
  getFlight.value.units.push({
    tailNr: undefined,
    callsign: "",
    search: "",
    laser: "",
    m2: "",
    tacan: "",
    STN: getSTN(
      getFlight.value.aircrafttype,
      getFlight.value.callsign,
      getFlight.value.callsignNumber,
      getFlight.value.units.length
    ),
    L16: (() => {
      const callsign = getFlight.value.callsign;
      return (
        callsign.charAt(0) +
        callsign.charAt(callsign.length - 1) +
        getFlight.value.callsignNumber +
        (getFlight.value.units.length + 1)
      );
    })(),
  }); // adds TACAN
  tacaninput();
};

function deleteMember(i: number) {
  getFlight.value.units.splice(i, 1);

  getFlight.value.units.map((n, i) => {
    (n.callsign = n.callsign),
      (n.tailNr = n.tailNr),
      (n.STN = n.STN.substring(0, n.STN.length - 1) + (i + 1));
    n.L16 = n.L16.substring(0, n.L16.length - 1) + (i + 1);
  }); // corrects TACAN
  tacaninput();
}

function deleteAirport(type: "DEP" | "ARR" | "ALT") {
  assignAirport(type, structuredClone(airfieldEmpty));
}

function assignAirport(type: "DEP" | "ARR" | "ALT", ap: (typeof airports)[0]) {
  getFlight.value[type] = ap;

  const offset = type === "DEP" ? 1 : type === "ARR" ? 6 : 9;
  const comms = getFlight.value.comms;
  if (type === "DEP") {
    comms.radio1[0] = {
      freq: ap.ATIS.uhf,
      description: ap.ATIS.uhf ? ap.ICAO + " " + "ATIS" : "",
      name: "",
    };
    comms.radio2[0] = {
      freq: ap.ATIS.vhf,
      description: ap.ATIS.vhf ? ap.ICAO + " " + "ATIS" : "",
      name: "",
    };
  }

  comms.radio1[offset + (type === "DEP" ? 2 : 0)] = {
    freq: ap.APPR.uhf,
    description: ap.APPR.uhf ? ap.ICAO + " " + "APR" : "",
    name: "",
  };
  comms.radio2[offset + (type === "DEP" ? 2 : 0)] = {
    freq: ap.APPR.vhf,
    description: ap.APPR.vhf ? ap.ICAO + " " + "APR" : "",
    name: "",
  };

  comms.radio1[offset + 1] = {
    freq: ap.TOWER.uhf,
    description: ap.TOWER.uhf ? ap.ICAO + " " + "TWR" : "",
    name: "",
  };
  comms.radio2[offset + 1] = {
    freq: ap.TOWER.vhf,
    description: ap.TOWER.vhf ? ap.ICAO + " " + "TWR" : "",
    name: "",
  };

  comms.radio1[offset + (type === "DEP" ? 0 : 2)] = {
    freq: ap.GROUND.uhf,
    description: ap.GROUND.uhf ? ap.ICAO + " " + "GRND" : "",
    name: "",
  };
  comms.radio2[offset + (type === "DEP" ? 0 : 2)] = {
    freq: ap.GROUND.vhf,
    description: ap.GROUND.vhf ? ap.ICAO + " " + "GRND" : "",
    name: "",
  };
}

const _313ref = ref(rnlaf313members.map((n) => n.callsign));

const groupedFlights = computed(() =>
  flights.reduce((coll, curr) => {
    if (
      packages.value.find((e) =>
        e.flights.find((n) => {
          // Filters out already assigned Callsigns
          return n.callsign.toLowerCase() == curr.callsign.toLowerCase();
        })
      )
    )
      return coll;

    const group = coll.map((n) => n.label).indexOf(curr.type);
    if (group !== -1)
      coll[group].items.push({
        callsign: curr.callsign,
        callsignNumber: curr.number,
        type: curr.type,
      });
    else
      coll.push({
        label: curr.type,
        items: [
          {
            callsign: curr.callsign,
            callsignNumber: curr.number,
            type: curr.type,
          },
        ],
      });

    return coll;
  }, new Array<{ label: string; items: Array<{ callsign: String; callsignNumber: Number; type: String }> }>())
);
</script>

<template>
  <div class="flex flex-wrap max-w-[2000px] p-4">
    <div class="mr-4">
      <p v-if="file && getFlight.isActive">Select Flight To Edit</p>
      <p v-else>Please select a flight first</p>
      <SelectFlight
        v-if="file"
        showFlightSelection
        :show-p-k-g-selection="false"
      />
    </div>
    <div v-if="file && getFlight.isActive" class="mr-4">
      <p>Assign new Callsign</p>
      <Select
        placeholder="select new callsign"
        v-if="!isCustomCalsign && getFlight.isActive"
        filter
        :options="groupedFlights"
        optionLabel="callsign"
        class="w-[253px] m-1"
        optionGroupLabel="label"
        optionGroupChildren="items"
        @change="callsignChangeEvent"
      >
        <template #optiongroup="slotProps">
          <div>{{ slotProps.option.label }}</div>
        </template>
      </Select>
      <div v-if="isCustomCalsign && getFlight" class="flex w-[250px]">
        <InputText
          v-model="getFlight.callsign"
          @blur="flightStore.updateFligh()"
          class="w-[100px]"
        />
        <InputNumber
          :min="1"
          :max="9"
          v-model="getFlight.callsignNumber"
          class="w-[50px] ml-1 block [&>*]:w-full"
          @blur="useFlightStore().updateFligh()"
        />
      </div>
    </div>
    <div
      class="text-left mt-3.5 w-[200px] ml-4 flex flex-wrap"
      v-if="file && getFlight.isActive"
    >
      <div class="flex items-center gap-2 w-full mb-2">
        <Checkbox
          v-if="getFlight"
          id="customCheckbox"
          v-model="isCustomCalsign"
          :binary="true"
          outlined
        />
        <label for="customCheckbox">Use Custom Callsign</label>
      </div>
      <div class="flex items-center gap-2 w-full">
        <Checkbox
          id="editDefaults"
          v-model="useDefaults"
          :binary="true"
          outlined
        />
        <label for="editDefaults">Use Defaults</label>
      </div>
    </div>
  </div>

  <Tabs value="0" v-if="file && getFlight.isActive" class="mt-2.5 mx-4">
    <TabList>
      <Tab value="0">Common Settings</Tab>
      <Tab value="1">Gameplan</Tab>
      <Tab value="2">COMMS Settings</Tab>
      <Tab value="3">MISC Settings</Tab>
      <Tab value="4">HARM/HTS</Tab>
    </TabList>
    <TabPanel value="0">
      <div class="mt-4">
        <p class="font-medium mb-2">Member in selected Flight</p>
        <DataTable
          :value="getFlight.units"
          showGridlines
          edit-mode="cell"
          class="w-[800px]"
        >
          <Column header="n°" headerStyle="width: 3rem">
            <template #body="{ index }">#{{ index + 1 }}</template>
          </Column>
          <Column class="w-32 max-w-32" header="Callsign" field="callsign">
            <template #body="{ data, field }">{{ data[field] }}</template>
            <template #editor="{ index }">
              <Select
                editable
                @change="flightMemberUpdate"
                :options="_313ref"
                v-model="getFlight.units[index].callsign"
                autofocus
              />
            </template>
          </Column>
          <Column header="Search" class="w-20 max-w-20" field="search">
            <template #body="{ data, field }">{{ data[field] }}</template>
            <template #editor="{ index }">
              <InputText v-model="getFlight.units[index].search" />
            </template>
          </Column>
          <Column field="STN" header="STN" class="w-20 max-w-20">
            <template #body="{ data, field }">{{ data[field] }}</template>
            <template #editor="{ index }">
              <InputMask
                mask="9?99999"
                :autoClear="false"
                v-model="getFlight.units[index].STN"
              />
            </template>
          </Column>
          <Column field="tailNr" header="TailNr" headerStyle="max-width: 4rem">
            <template #body="{ data, field }">{{ data[field] }}</template>
            <template #editor="{ index }">
              <InputText v-model="getFlight.units[index].tailNr" />
            </template>
          </Column>
          <Column field="L16" header="L16" headerStyle="max-width: 4rem" />
          <Column field="tacan" header="TACAN" headerStyle="max-width: 4rem">
            <template #editor="{ index }">
              <InputMask
                :disabled="index > 0 && useDefaults"
                :mask="useDefaults ? '9?*a' : '99?*a'"
                v-model="getFlight.units[index].tacan"
                @complete="tacaninput"
              />
            </template>
          </Column>
          <Column field="laser" header="Laser" headerStyle="max-width: 4rem">
            <template #body="{ data, field }">{{ data[field] }}</template>
            <template #editor="{ index }">
              <InputMask mask="9999" v-model="getFlight.units[index].laser" />
            </template>
          </Column>
          <Column headerStyle="width: 2rem">
            <template #header><i icon="pi pi-trash" /></template>
            <template #body="{ index }">
              <Button
                :disabled="getFlight.units.length < 2"
                @click="deleteMember(index)"
                severity="danger"
                outlined
                icon="pi pi-trash"
              />
            </template>
          </Column>
          <template #footer>
            <Button
              v-if="getFlight.units[0] && getFlight.units.length < 4"
              label="Add member to flight"
              @click="addFlightMemeber"
            />
          </template>
        </DataTable>
      </div>
    </TabPanel>
    <TabPanel value="1">
      <TextArea
        class="min-w-[600px] min-h-[200px] resize-none"
        v-model="getFlight.gameplan"
        :draggable="false"
        rows="3"
      />
    </TabPanel>
    <TabPanel value="2"></TabPanel>
    <TabPanel value="3">
      <div
        class="grid grid-cols-[100px_140px_300px] gap-x-0.5 gap-y-1 auto-rows-[24px]"
      >
        <Checkbox />
        <span>Bingo</span>
        <InputNumber />
        <Checkbox v-model="enableBullz" binary />
        <span>Enable Bullseye</span>
        <Select
          :options="selectedPKG.bullseyes"
          option-value="wp"
          v-model:model-value="getFlight.misc.BullseyeWP"
        >
          <template #value
            >{{ getFlight.misc.BullseyeWP }}:
            {{
              selectedPKG.bullseyes.find(
                (n) => n.wp === getFlight.misc.BullseyeWP
              )?.name
            }}
          </template>
          <template #option="{ option }"
            >{{ option.wp }}: {{ option.name }}</template
          >
        </Select>
        <Checkbox />
        <span>CARA ALLOW</span>
        <InputNumber />
        <Checkbox />
        <span>MSL Floor</span>
        <InputNumber />
        <Checkbox />
        <span>Laser Settings</span>
        <div />
        <div />
        <span>TGP Code</span>
        <div class="flex">
          <Select />
          <Select />
          <Select />
          <Select />
        </div>
        <div />
        <span>LST Code</span>
        <div class="flex">
          <Select />
          <Select />
          <Select />
          <Select />
        </div>
        <div />
        <span>Laser Start Time</span>
        <InputNumber />
        <Checkbox />
        <span>TACAN</span>
        <div class="flex w-1/2">
          <InputMask mask="9?9" class="w-1/2" />
          <Select class="w-1/2" :options="['X', 'Y']" />
        </div>
        <Checkbox />
        <span>ILS</span>
        <div />
        <div />
        <span>Frequency</span>
        <InputNumber />
        <div />
        <span>Course</span>
        <InputNumber />
      </div>
    </TabPanel>
    <TabPanel value="4">Work in Progress</TabPanel>
  </Tabs>

  <div class="flex flex-wrap p-4" v-if="file && getFlight.isActive">
    <div class="max-w-[225px] xl:max-w-none">
      <div class="m-1.5 min-w-[215px]">
        <p class="font-medium mb-1">DEPART</p>
        <Select
          :options="airports.filter((val) => val.map === theatre)"
          class="w-[175px]"
          severity="danger"
          option-label="NAME"
          v-model="getFlight.DEP"
          @change="(e: any) => assignAirport('DEP', e.value)"
          placeholder="select"
        />
        <Button
          class="text-gray-500"
          v-if="getFlight.DEP.ICAO"
          icon="pi pi-times-circle"
          @click="deleteAirport('DEP')"
          text
        />
      </div>

      <div class="m-1.5 min-w-[215px]">
        <p class="font-medium mb-1">ARRIVE</p>
        <Select
          :options="airports.filter((val) => val.map === theatre)"
          severity="danger"
          class="w-[175px]"
          option-label="NAME"
          v-model="getFlight.ARR"
          @change="(e: any) => assignAirport('ARR', e.value)"
          placeholder="select"
        />
        <Button
          v-if="getFlight.ARR.ICAO"
          icon="pi pi-times-circle"
          @click="deleteAirport('ARR')"
          text
        />
      </div>

      <div class="m-1.5 min-w-[215px]">
        <p class="font-medium mb-1">ALTERNATE</p>
        <Select
          :options="airports.filter((val) => val.map === theatre)"
          severity="danger"
          class="w-[175px]"
          option-label="NAME"
          v-model="getFlight.ALT"
          @change="(e: any) => assignAirport('ALT', e.value)"
          placeholder="select"
        />
        <Button
          v-if="getFlight.ALT.ICAO"
          icon="pi pi-times-circle"
          @click="deleteAirport('ALT')"
          text
        />
      </div>

      <div class="flex flex-wrap">
        <div class="m-1.5 min-w-[215px] w-[214px]">
          <p class="font-medium mb-1">CHECK-IN UHF</p>
          <Select
            :options="tacticalFreqs.filter((n) => parseFloat(n.freq) > 200)"
            severity="danger"
            class="w-[175px]"
            option-label="description"
            :model-value="selectedFreqs.checkUHF"
            @change="(e: any) => {
              getFlight.comms.radio1[4] = {
                description: e.value.description,
                freq: e.value.freq,
                name: e.value.name,
                number: e.value.number ?? NaN,
              };
            }"
            placeholder="select"
          />
          <Button
            v-if="getFlight.comms.radio1[4].freq"
            icon="pi pi-times-circle"
            @click="clearComms(4, 'pri')"
            text
          />
        </div>
        <div class="m-1.5 min-w-[215px]">
          <p class="font-medium mb-1">CHECK-IN VHF</p>
          <Select
            :options="tacticalFreqs.filter((n) => parseFloat(n.freq) < 200)"
            severity="danger"
            class="w-[175px]"
            v-model="selectedFreqs.checkVHF"
            option-label="description"
            @change="(e: any) => {
              getFlight.comms.radio2[4] = {
                description: e.value.description,
                freq: e.value.freq,
                name: e.value.name,
                number: e.value.number ?? NaN,
              };
            }"
            placeholder="select"
          />
          <Button
            v-if="getFlight.comms.radio2[4].freq"
            icon="pi pi-times-circle"
            @click="clearComms(4, 'sec')"
            text
          />
        </div>
      </div>

      <div class="flex flex-wrap">
        <div class="m-1.5 min-w-[215px] w-[214px]">
          <p class="font-medium mb-1">TACTICAL UHF</p>
          <Select
            :options="tacticalFreqs.filter((n) => parseFloat(n.freq) > 200)"
            severity="danger"
            class="w-[175px]"
            v-model="selectedFreqs.tactUHF"
            option-label="description"
            @change="(e: any) => {
              getFlight.comms.radio1[5] = {
                description: e.value.description,
                freq: e.value.freq,
                name: e.value.name,
                number: e.value.number ?? NaN,
              };
            }"
            placeholder="select"
          />
          <Button
            v-if="getFlight.comms.radio1[5].freq"
            icon="pi pi-times-circle"
            @click="clearComms(5, 'pri')"
            text
          />
        </div>
        <div class="m-1.5 min-w-[215px]">
          <p class="font-medium mb-1">TACTICAL VHF</p>
          <Select
            :options="tacticalFreqs.filter((n) => parseFloat(n.freq) < 200)"
            severity="danger"
            class="w-[175px]"
            v-model="selectedFreqs.tactVHF"
            option-label="description"
            @change="(e: any) => {
              getFlight.comms.radio2[5] = {
                description: e.value.description,
                freq: e.value.freq,
                name: e.value.name,
                number: e.value.number ?? NaN,
              };
            }"
            placeholder="select"
          />
          <Button
            v-if="getFlight.comms.radio2[5].freq"
            icon="pi pi-times-circle"
            @click="clearComms(5, 'sec')"
            text
          />
        </div>
      </div>

      <div class="m-1.5 min-w-[215px]">
        <p class="font-medium mb-1">TANKER</p>
        <Select
          :options="
            selectedPKG.agencies
              .filter((ag) =>
                ['KC-135', 'KC135MPRS', 'KC130'].includes(ag.type)
              )
              .sort((a, b) => a.name.charCodeAt(0) - b.name.charCodeAt(0))
          "
          severity="danger"
          class="w-[175px]"
          v-model="tanker"
          option-label="name"
          @change="(e: any) => { tanker = e.value; }"
          placeholder="select"
        />
        <Button
          v-if="tanker"
          icon="pi pi-times-circle"
          @click="clearComms(12, parseFloat(tanker.freq) > 200 ? 'pri' : 'sec')"
          text
        />
      </div>
    </div>

    <div class="flex flex-wrap m-2.5">
      <div class="m-2.5">
        <p class="font-medium mb-2">Radio 1</p>
        <DataTable
          showGridlines
          edit-mode="cell"
          :value="getFlight.comms.radio1"
          class="w-[450px]"
        >
          <Column
            header="#"
            headerStyle="width: 2rem"
            class="px-1 py-0.5 w-fit"
          >
            <template #body="{ index }">{{ index + 1 }}</template>
          </Column>
          <Column
            header="Freq"
            field="freq"
            headerStyle="width: 2rem"
            class="px-1 py-0.5 w-fit"
          >
            <template #body="{ data }">{{ data?.freq }}</template>
            <template #editor="{ index }">
              <InputText
                class="max-w-full"
                v-model="getFlight.comms.radio1[index].freq"
              />
            </template>
          </Column>
          <Column header="Name" field="name" class="px-1 py-0.5 w-fit">
            <template #body="{ data }">{{ data?.name }}</template>
            <template #editor="{ index }">
              <InputText v-model="getFlight.comms.radio1[index].name" />
            </template>
          </Column>
          <Column header="n°" field="number" class="px-1 py-0.5 max-w-[70px]">
            <template #body="{ data }">{{ data?.number || null }}</template>
            <template #editor="{ index }">
              <InputNumber
                class="max-w-full"
                v-model="getFlight.comms.radio1[index].number"
              />
            </template>
          </Column>
          <Column header="Description" field="description" class="px-1 py-0.5">
            <template #body="{ data }">{{ data?.description }}</template>
            <template #editor="{ index }">
              <InputText
                class="max-w-full"
                v-model="getFlight.comms.radio1[index].description"
              />
            </template>
          </Column>
          <Column class="px-1 py-0.5 w-5">
            <template #body="{ index }">
              <Button
                text
                icon="pi pi-eraser"
                @click="clearComms(index, 'pri')"
              />
            </template>
          </Column>
        </DataTable>
        <toDTC class="mt-2" />
      </div>

      <div class="m-2.5">
        <p class="font-medium mb-2">Radio 2</p>
        <DataTable
          showGridlines
          class="w-[450px]"
          edit-mode="cell"
          :value="getFlight.comms.radio2"
        >
          <Column header="#" class="px-1 py-0.5">
            <template #body="{ index }">{{ index + 1 }}</template>
          </Column>
          <Column header="Freq" field="freq" class="px-1 py-0.5">
            <template #body="{ data }">{{ data?.freq }}</template>
            <template #editor="{ index }">
              <InputText
                class="max-w-full"
                v-model="getFlight.comms.radio2[index].freq"
              />
            </template>
          </Column>
          <Column header="Name" field="name" class="px-1 py-0.5">
            <template #body="{ data }">{{ data?.name }}</template>
            <template #editor="{ index }">
              <InputText
                class="max-w-full"
                v-model="getFlight.comms.radio2[index].name"
              />
            </template>
          </Column>
          <Column header="n°" field="number" class="px-1 py-0.5">
            <template #body="{ data }">{{ data?.number || null }}</template>
            <template #editor="{ index }">
              <InputNumber
                class="max-w-full"
                v-model="getFlight.comms.radio2[index].number"
              />
            </template>
          </Column>
          <Column header="Description" field="description" class="px-1 py-0.5">
            <template #body="{ data }">{{ data?.description }}</template>
            <template #editor="{ index }">
              <InputText
                class="max-w-full"
                v-model="getFlight.comms.radio2[index].description"
              />
            </template>
          </Column>
          <Column class="px-1 py-0.5 w-5">
            <template #body="{ index }">
              <Button
                text
                icon="pi pi-eraser"
                @click="clearComms(index, 'sec')"
              />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>
