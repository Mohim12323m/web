import { useContext, useState, useMemo } from 'react';
import AppContext from '../../../context/AppContext';
import {
    Alert,
    Box,
    Button,
    IconButton,
    ListItemAvatar,
    ListItemIcon,
    ListItemText,
    MenuItem,
    Typography,
} from '@mui/material';
import L from 'leaflet';
import contextMenuStyles from '../../styles/ContextMenuStyles';
import { Cancel } from '@mui/icons-material';
import PointManager from '../../../context/PointManager';
import TracksManager from '../../../context/TracksManager';
import wptTabStyle from '../../styles/WptTabStyle';
import { confirm } from '../../../dialogs/GlobalConfirmationDialog';
// import { measure } from '../../../util/Utils';
import _ from 'lodash';

// distinct component
const WaypointRow = ({ point, index, ctx }) => {
    const NAME_SIZE = 30;
    const stylesWpt = wptTabStyle();

    const [showMore, setShowMore] = useState(false);

    function showPoint(point) {
        ctx.setSelectedWpt(point);
        ctx.setSelectedGpxFile((o) => ({ ...o, showPoint: point }));
    }

    function getLength(point) {
        return point.layer.options?.desc && point.layer.options.address ? 15 : 30;
    }

    function getName(point) {
        let name = point.layer.options?.title;
        if (name) {
            if (name.length > NAME_SIZE) {
                return point.layer.options?.title.substring(0, NAME_SIZE);
            } else {
                return name;
            }
        }
    }

    function hasInfo(wpt) {
        return wpt.layer.options?.desc !== undefined || wpt.layer.options?.address !== undefined || wpt.wpt.category;
    }

    function showWithInfo(point) {
        return (
            <>
                <ListItemIcon>
                    <div
                        className={stylesWpt.icon}
                        dangerouslySetInnerHTML={{ __html: point.layer.options.icon.options.html + '' }}
                    />
                </ListItemIcon>
                <ListItemText sx={{ ml: '-35px !important' }}>
                    <Typography component={'span'} variant="inherit" noWrap>
                        {getName(point)}
                        {point.layer.options?.title?.length > NAME_SIZE && (
                            <ListItemIcon style={{ marginRight: ' -25px' }}>{'...'}</ListItemIcon>
                        )}
                        <br />
                        <Typography component={'span'} variant="caption">
                            {point.wpt.category}
                        </Typography>
                        {point.wpt.category && (point.layer.options?.address || point.layer.options?.desc) && (
                            <ListItemIcon style={{ marginLeft: '5px', marginRight: ' -25px' }}>{' • '}</ListItemIcon>
                        )}
                        <Typography component={'span'} variant="caption" style={{ wordWrap: 'break-word' }}>
                            {showMore
                                ? point.layer.options?.desc
                                : point.layer.options?.desc?.substring(0, getLength(point))}
                            {point.layer.options?.desc?.length > getLength(point) && (
                                <ListItemIcon style={{ marginRight: ' -25px' }}>{'...'}</ListItemIcon>
                            )}
                        </Typography>
                        {point.layer.options?.address && point.layer.options?.desc && (
                            <ListItemIcon style={{ marginLeft: '5px', marginRight: ' -25px' }}>{' • '}</ListItemIcon>
                        )}
                        <Typography component={'span'} variant="caption" style={{ wordWrap: 'break-word' }}>
                            {showMore
                                ? point.layer.options?.address
                                : point.layer.options?.address?.substring(0, getLength(point))}
                            {point.layer.options?.address?.length > getLength(point) && (
                                <ListItemIcon onClick={() => setShowMore(!showMore)}>
                                    {showMore ? ' ...less' : ' ...more'}
                                </ListItemIcon>
                            )}
                        </Typography>
                    </Typography>
                </ListItemText>
            </>
        );
    }

    function showOnlyName(point) {
        return (
            <>
                <ListItemIcon>
                    <div
                        className={stylesWpt.iconOnlyName}
                        dangerouslySetInnerHTML={{ __html: point.layer.options.icon.options.html + '' }}
                    />
                </ListItemIcon>
                <ListItemText sx={{ ml: '-35px !important' }}>
                    <Typography variant="inherit" noWrap>
                        {getName(point)}
                        {point.layer.options?.title?.length > NAME_SIZE && (
                            <ListItemIcon style={{ marginRight: ' -25px' }}>{'...'}</ListItemIcon>
                        )}
                    </Typography>
                </ListItemText>
            </>
        );
    }

    const row = useMemo(
        () => (
            <MenuItem key={'marker' + index} divider onClick={() => showPoint(point)}>
                {hasInfo(point) ? showWithInfo(point) : showOnlyName(point)}
                <ListItemAvatar>
                    {ctx.currentObjectType === ctx.OBJECT_TYPE_LOCAL_CLIENT_TRACK && (
                        <IconButton
                            sx={{ mr: 1 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                PointManager.deleteWpt(index, ctx);
                            }}
                        >
                            <Cancel fontSize="small" />
                        </IconButton>
                    )}
                </ListItemAvatar>
            </MenuItem>
        ),
        [
            index,
            point.wpt?.lat,
            point.wpt?.lon,
            point.wpt?.category,
            point.layer?.options?.desc,
            point.layer?.options?.title,
            point.layer?.options?.address,
            point.layer?.options?.icon?.options?.html,
            ctx.currentObjectType,
        ]
    );

    return row;
};

export default function WaypointsTab() {
    const ctx = useContext(AppContext);

    const stylesMenu = contextMenuStyles();

    const [openWptAlert, setOpenWptAlert] = useState(true);

    function getLayers() {
        if (ctx.selectedGpxFile?.layers && !_.isEmpty(ctx.selectedGpxFile.layers)) {
            return ctx.selectedGpxFile.layers.getLayers();
        }
        if (ctx.selectedGpxFile?.gpx) {
            return ctx.selectedGpxFile.gpx.getLayers();
        }
        return [];
    }

    function getPoints() {
        const wpts = [];

        if (ctx.selectedGpxFile.wpts) {
            const layers = getLayers();
            const wptsMap = Object.fromEntries(ctx.selectedGpxFile.wpts.map((p) => [p.lat + ',' + p.lon, p]));

            layers.forEach((layer) => {
                if (layer instanceof L.Marker) {
                    const coord = layer.getLatLng();
                    const key = coord.lat + ',' + coord.lng;
                    const wpt = wptsMap[key];
                    wpt && wpts.push({ wpt, layer });
                }
            });
        }

        return wpts;
    }

    // TODO
    // function addWaypoint() {
    //     ctx.selectedGpxFile.addWpt = true;
    //     ctx.setSelectedGpxFile({...ctx.selectedGpxFile});
    // }

    function deleteAllWpts() {
        confirm({
            ctx,
            text: 'Delete all waypoints?',
            callback: () => {
                ctx.selectedGpxFile.wpts = [];
                ctx.selectedGpxFile.updateLayers = true;
                TracksManager.updateState(ctx);
                ctx.setSelectedGpxFile({ ...ctx.selectedGpxFile });
            },
        });
    }

    function pointsChangedString() {
        const dep = getPoints().map((p) => [p.wpt, p.layer.options]);
        return dep ? JSON.stringify(dep) : null;
    }

    const waypoints = useMemo(
        () => (
            <Box className={stylesMenu.item} minWidth={ctx.infoBlockWidth}>
                {ctx.selectedGpxFile.wpts &&
                    getPoints().map((point, index) => (
                        <WaypointRow key={'wpt' + index} point={point} index={index} ctx={ctx} />
                    ))}
            </Box>
        ),
        [pointsChangedString(), ctx.currentObjectType]
    );

    return (
        <>
            {ctx.createTrack && ctx.selectedGpxFile?.wpts && !_.isEmpty(ctx.selectedGpxFile.wpts) && (
                <Button variant="contained" className={stylesMenu.button} onClick={deleteAllWpts} sx={{ mb: 2 }}>
                    Clear waypoints
                </Button>
            )}

            {openWptAlert && ctx.createTrack && (!ctx.selectedGpxFile.wpts || _.isEmpty(ctx.selectedGpxFile.wpts)) && (
                <Alert
                    sx={{ mt: 2 }}
                    severity="info"
                    onClose={() => {
                        setOpenWptAlert(false);
                    }}
                >
                    Use the context menu to add a waypoint...
                </Alert>
            )}
            {waypoints}
        </>
    );
}
