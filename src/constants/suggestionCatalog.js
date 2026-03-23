import { OPERATING_CONDITION_TYPE } from './variableTypes';

export const FAULT_SPECIFICATION_SUGGESTIONS = [
    {
        name: 'Fault Type',
        type: 'Qualitative fault specification',
        unit: '',
        description: 'Type of fault introduced onto the bearing'
    },
    {
        name: 'Fault Location',
        type: 'Qualitative fault specification',
        unit: '',
        description: 'Location of the fault on the component (e.g., inner race, outer race, rolling element).'
    },
    {
        name: 'Fault Severity',
        type: 'Quantitative fault specification',
        unit: '',
        description: 'Severity of the fault introduced'
    },
    {
        name: 'Fault Size',
        type: 'Quantitative fault specification',
        unit: 'mm',
        description: 'Physical size of the seeded or observed fault.'
    },
    {
        name: 'Fault Depth',
        type: 'Quantitative fault specification',
        unit: 'mm',
        description: 'Depth of material loss or defect cavity.'
    },
    {
        name: 'Fault Diameter',
        type: 'Quantitative fault specification',
        unit: 'mm',
        description: 'Characteristic defect diameter used in seeded fault experiments.'
    },
    {
        name: 'Fault Position',
        type: 'Qualitative fault specification',
        unit: '',
        description: 'Position of the fault introduced.'
    },
    {
        name: 'Fault Component',
        type: 'Qualitative fault specification',
        unit: '',
        description: 'Target component carrying the defect (e.g., bearing, gear, shaft).'
    },
    {
        name: 'VB',
        type: 'Damage',
        unit: 'mm',
        description: 'Wear land width VB, commonly used in milling tool wear monitoring.'
    }
];

export const OPERATING_CONDITION_SUGGESTIONS = [
    {
        name: 'Rotational Speed',
        type: OPERATING_CONDITION_TYPE,
        unit: 'RPM',
        description: 'Rotational speed of the drivetrain or spindle.'
    },
    {
        name: 'Motor Speed',
        type: OPERATING_CONDITION_TYPE,
        unit: 'RPM',
        description: 'Motor speed of the axle that drives the bearing.'
    },
    {
        name: 'Spindle Speed',
        type: OPERATING_CONDITION_TYPE,
        unit: 'RPM',
        description: 'Spindle rotational speed during machining.'
    },
    {
        name: 'Load',
        type: OPERATING_CONDITION_TYPE,
        unit: 'N',
        description: 'Applied mechanical load during operation.'
    },
    {
        name: 'Torque',
        type: OPERATING_CONDITION_TYPE,
        unit: 'Nm',
        description: 'Torque transmitted through the drivetrain.'
    },
    {
        name: 'Temperature',
        type: OPERATING_CONDITION_TYPE,
        unit: 'degC',
        description: 'Local operating temperature near component or sensor.'
    },
    {
        name: 'Ambient Temperature',
        type: OPERATING_CONDITION_TYPE,
        unit: 'degC',
        description: 'Ambient laboratory or environmental temperature.'
    },
    {
        name: 'Pressure',
        type: OPERATING_CONDITION_TYPE,
        unit: 'bar',
        description: 'System or line pressure during operation.'
    },
    {
        name: 'Current',
        type: OPERATING_CONDITION_TYPE,
        unit: 'A',
        description: 'Electrical current draw of the machine or motor.'
    },
    {
        name: 'Voltage',
        type: OPERATING_CONDITION_TYPE,
        unit: 'V',
        description: 'Supply voltage during the run.'
    },
    {
        name: 'Cutting Speed',
        type: OPERATING_CONDITION_TYPE,
        unit: 'rev/min',
        description: 'Cutting speed used during milling.'
    },
    {
        name: 'Depth of Cut',
        type: OPERATING_CONDITION_TYPE,
        unit: 'mm',
        description: 'Depth of cut per pass.'
    },
    {
        name: 'Feed Rate',
        type: OPERATING_CONDITION_TYPE,
        unit: 'mm/rev',
        description: 'Linear feed per spindle revolution.'
    },
    {
        name: 'Feed',
        type: OPERATING_CONDITION_TYPE,
        unit: 'mm/rev',
        description: 'Feed setting used during machining.'
    },
    {
        name: 'Material',
        type: OPERATING_CONDITION_TYPE,
        unit: '',
        description: 'Workpiece or sample material class.'
    },
    {
        name: 'Humidity',
        type: OPERATING_CONDITION_TYPE,
        unit: '%',
        description: 'Relative humidity (RH) in the environment.'
    },
    {
        name: 'Lubrication State',
        type: OPERATING_CONDITION_TYPE,
        unit: '',
        description: 'Lubrication condition (e.g., dry, normal, over-lubricated, contaminated).'
    }
];

export const MEASUREMENT_PROTOCOL_PARAMETER_SUGGESTIONS = [
    {
        name: 'Sensor Location',
        description: 'Location where the sensor is mounted on the test setup.'
    },
    {
        name: 'Sensor Orientation',
        description: 'Orientation of the mounted sensor on the setup.'
    },
    {
        name: 'Sensor Mounting Method',
        description: 'Mounting method such as adhesive, stud, magnetic, or bracket.'
    },
    {
        name: 'Sampling Rate',
        description: 'Rate at which sensors collect a new sample.'
    },
    {
        name: 'Acquisition Duration',
        description: 'Measurement duration captured per run or segment.'
    },
    {
        name: 'ADC Resolution',
        description: 'Bit depth of analog-to-digital conversion.'
    },
    {
        name: 'Measured Unit',
        description: 'Measured unit of the sensor channel.'
    },
    {
        name: 'Phase',
        description: 'Current/voltage phase measured.'
    },
    {
        name: 'Sensor Frequency Range',
        description: 'Frequency range over which the sensor reliably captures machining signals.'
    },
    {
        name: 'Filter Type',
        description: 'Type of signal filtering applied to the sensor output to remove unwanted frequency components.'
    },
    {
        name: 'HP cutoff frequency',
        description: 'Cutoff frequency for a high-pass filter applied to the sensor signal to remove low-frequency noise.'
    },
    {
        name: 'Trigger Type',
        description: 'Acquisition trigger type (time-based, threshold, external trigger).'
    },
    {
        name: 'Trigger Threshold',
        description: 'Threshold value used to start acquisition in trigger mode.'
    },
    {
        name: 'Anti-alias Filter',
        description: 'Anti-aliasing filter configuration used before sampling.'
    },
    {
        name: 'Sensor Sensitivity',
        description: 'Sensor sensitivity conversion factor from signal to engineering units.'
    },
    {
        name: 'Preamplifier',
        description: 'Device used to boost sensor signals before main amplification, reducing signal loss and noise.'
    },
    {
        name: 'Preamplifier Gain',
        description: 'Gain applied in the preamplifier stage.'
    },
    {
        name: 'Amplifier',
        description: 'Device that further amplifies the preamplified sensor signal for recording or processing.'
    },
    {
        name: 'Amplifier Gain',
        description: 'Gain setting of the main amplifier.'
    },
    {
        name: 'Amplifier max load',
        description: 'Maximum signal amplitude the amplifier can handle without distortion.'
    },
    {
        name: 'Amplifier min load',
        description: 'Minimum detectable signal amplitude for accurate measurement.'
    },
    {
        name: 'Amplifier sensitivity',
        description: 'Amplifier gain, defining how input signals are scaled to output voltage.'
    },
    {
        name: 'Amplifier output',
        description: 'Voltage output from the amplifier that feeds the data acquisition system.'
    },
    {
        name: 'Current converter',
        description: 'Device that converts machine current into a measurable voltage or digital signal.'
    },
    {
        name: 'Power supply',
        description: 'Electrical source providing voltage and current to sensors, amplifiers, and acquisition hardware.'
    },
    {
        name: 'Power supply output',
        description: 'Nominal voltage and current delivered by the power supply to instrumentation.'
    },
    {
        name: 'Current type',
        description: 'Type of current being measured in the experiment, such as AC or DC from the milling machine motor.'
    }
];

export const PROCESSING_PROTOCOL_PARAMETER_SUGGESTIONS = [
    {
        name: 'Filter type',
        description: 'Type of signal filter applied to the measurement data, such as low-pass, high-pass, or band-pass, to remove unwanted frequency components.'
    },
    {
        name: 'Filter order',
        description: 'Order of the digital/analog filter.'
    },
    {
        name: 'Chunk size',
        description: 'Chunk size used for processing.'
    },
    {
        name: 'Scaling range',
        description: 'Scaling range for processed data.'
    },
    {
        name: 'Scaling resolution',
        description: 'Scaling resolution for processed data.'
    },
    {
        name: 'Filter roll-off rate',
        description: 'Rate at which the filter attenuates frequencies beyond the cutoff, describing the steepness of the filter slope.'
    },
    {
        name: 'Filter LP cutoff frequency',
        description: 'Cutoff frequency for a low-pass filter applied to the signal to remove high-frequency noise.'
    },
    {
        name: 'Filter HP cutoff frequency',
        description: 'Cutoff frequency for a high-pass filter applied to the signal to remove low-frequency noise.'
    },
    {
        name: 'Window function',
        description: 'Window function applied before spectral transforms (e.g., Hanning, Hamming).'
    },
    {
        name: 'FFT size',
        description: 'FFT length used for frequency-domain feature extraction.'
    },
    {
        name: 'Segment length',
        description: 'Signal segment length used for block processing.'
    },
    {
        name: 'Overlap',
        description: 'Segment overlap used in block-based processing.'
    },
    {
        name: 'Resampling frequency',
        description: 'Target resampling frequency after decimation/interpolation.'
    },
    {
        name: 'Detrending method',
        description: 'Method to remove trend or DC components before analysis.'
    },
    {
        name: 'Normalization method',
        description: 'Normalization approach such as z-score, min-max, or robust scaling.'
    },
    {
        name: 'Smoothing method',
        description: 'Algorithm or approach used to smooth the sensor signal, reducing high-frequency fluctuations.'
    },
    {
        name: 'Smoothing time constant',
        description: 'Characteristic time over which the smoothing algorithm averages or filters the signal.'
    },
    {
        name: 'Smoothing sampling frequency',
        description: 'Frequency at which the smoothed signal is sampled or updated during acquisition or processing.'
    }
];
